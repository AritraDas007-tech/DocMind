import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import { openai } from "./replit_integrations/image/client"; // reusing existing client
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth (Passport strategy)
  setupAuth(app);

  // === Documents ===

  app.get(api.documents.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const docs = await storage.getDocuments(req.user!.id);
    res.json(docs);
  });

  app.post(api.documents.upload.path, upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    try {
      const buffer = req.file.buffer;
      const data = await pdf(buffer);
      const textContent = data.text;

      // Simple Chunking Strategy
      const chunks: { text: string; embedding: number[] }[] = [];
      const chunkSize = 1000;
      const rawChunks = textContent.match(new RegExp(`.{1,${chunkSize}}`, 'g')) || [];

      // Generate embeddings (batching for speed)
      // Limit to first 20 chunks for demo speed/cost if large
      const processedChunks = rawChunks.slice(0, 20); 

      for (const chunkText of processedChunks) {
        // Skip empty chunks
        if (!chunkText.trim()) continue;

        // Embedding
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: chunkText,
        });
        const embedding = embeddingResponse.data[0].embedding;
        chunks.push({ text: chunkText, embedding });
      }

      const doc = await storage.createDocument({
        userId: req.user!.id,
        name: req.file.originalname,
        size: req.file.size,
        url: "", // No cloud storage for Lite, just keeping content in DB
        content: textContent,
        chunks: chunks, // Storing vectors in JSONB for this demo
      });

      res.status(201).json(doc);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to process document" });
    }
  });

  app.delete(api.documents.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    await storage.deleteDocument(Number(req.params.id));
    res.status(204).send();
  });

  // === Chats ===

  app.get(api.chats.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const chats = await storage.getChats(req.user!.id);
    res.json(chats);
  });

  app.post(api.chats.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const input = api.chats.create.input.parse(req.body);
    const chat = await storage.createChat({
      ...input,
      userId: req.user!.id,
    });
    res.status(201).json(chat);
  });

  app.get(api.chats.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const id = Number(req.params.id);
    const chat = await storage.getChat(id);
    if (!chat || chat.userId !== req.user!.id) return res.status(404).send();
    
    const messages = await storage.getChatMessages(id);
    res.json({ ...chat, messages });
  });

  app.post(api.chats.sendMessage.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const chatId = Number(req.params.id);
    const { content } = req.body;

    const chat = await storage.getChat(chatId);
    if (!chat || chat.userId !== req.user!.id) return res.status(404).send();

    // 1. Save User Message
    await storage.createMessage({
      chatId,
      role: "user",
      content,
    });

    // 2. Retrieve Context (Vector Search in Memory)
    const doc = await storage.getDocument(chat.documentId);
    let context = "";
    
    if (doc && doc.chunks && Array.isArray(doc.chunks)) {
      // Create embedding for query
      const queryEmbeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: content,
      });
      const queryVector = queryEmbeddingResponse.data[0].embedding;

      // Calculate Cosine Similarity
      const chunksWithScore = (doc.chunks as any[]).map(chunk => {
        const dotProduct = chunk.embedding.reduce((sum: number, val: number, i: number) => sum + val * queryVector[i], 0);
        // Simple normalization assuming unit vectors (OpenAI embeddings are normalized)
        return { text: chunk.text, score: dotProduct };
      });

      // Sort by score
      chunksWithScore.sort((a, b) => b.score - a.score);

      // Take top 3
      context = chunksWithScore.slice(0, 3).map(c => c.text).join("\n\n");
    }

    // 3. Send to OpenAI
    const systemPrompt = `You are an intelligent assistant helping a user understand a document. 
    Use the following pieces of context to answer the question at the end.
    If the answer is not in the context, say you don't know, but try to be helpful.
    
    Context:
    ${context}
    `;

    const chatHistory = await storage.getChatMessages(chatId);
    // Limit history to last 10 messages to save context
    const recentHistory = chatHistory.slice(-10).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content
    }));

    // Stream Response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-4o", // or gpt-4o-mini
        messages: [
          { role: "system", content: systemPrompt },
          ...recentHistory,
          { role: "user", content }
        ],
        stream: true,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          fullResponse += delta;
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
      }

      // 4. Save Assistant Message
      await storage.createMessage({
        chatId,
        role: "assistant",
        content: fullResponse,
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

    } catch (error) {
      console.error("OpenAI Error:", error);
      res.write(`data: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`);
      res.end();
    }
  });

  return httpServer;
}
