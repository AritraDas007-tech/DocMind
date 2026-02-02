import type { Express } from "express";
import { type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import multer from "multer";
import { openai } from "./replit_integrations/image/client";

/* =====================================================
   PDF PARSER – SAFE LOADER (Node 24 + ESM FIX)
===================================================== */
async function loadPdfParser() {
  const mod: any = await import("pdf-parse");

  if (typeof mod === "function") return mod;
  if (typeof mod.default === "function") return mod.default;
  if (typeof mod.pdfParse === "function") return mod.pdfParse;

  throw new Error("pdf-parse export not found");
}

/* =====================================================
   FILE UPLOAD CONFIG
===================================================== */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/* =====================================================
   ROUTES
===================================================== */
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  /* ================= AUTH ================= */
  setupAuth(app);

  /* ================= DOCUMENTS ================= */

  app.get(api.documents.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const docs = await storage.getDocuments(req.user!.id);
    res.json(docs);
  });

  /* ========== PDF UPLOAD (FINAL FIXED) ========== */
  app.post(
    api.documents.upload.path,
    upload.single("file"),
    async (req, res) => {
      if (!req.isAuthenticated())
        return res.status(401).json({ message: "Unauthorized" });

      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });

      try {
        const pdfParse = await loadPdfParser();
        const pdfData = await pdfParse(req.file.buffer);

        const textContent = pdfData?.text ?? "";
        if (!textContent.trim()) {
          return res.status(400).json({ message: "Empty PDF content" });
        }

        /* ===== Chunking ===== */
        const chunkSize = 1000;
        const rawChunks =
          textContent.match(new RegExp(`.{1,${chunkSize}}`, "gs")) || [];

        const chunks: { text: string; embedding: number[] }[] = [];

        for (const chunkText of rawChunks.slice(0, 20)) {
          if (!chunkText.trim()) continue;

          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: chunkText,
          });

          chunks.push({
            text: chunkText,
            embedding: embeddingResponse.data[0].embedding,
          });
        }

        const doc = await storage.createDocument({
          userId: req.user!.id,
          name: req.file.originalname,
          size: req.file.size,
          url: "",
          content: textContent,
          chunks,
        });

        res.status(201).json(doc);
      } catch (err) {
        console.error("PDF Upload Error:", err);
        res.status(500).json({ message: "Failed to process document" });
      }
    }
  );

  app.delete(api.documents.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    await storage.deleteDocument(Number(req.params.id));
    res.status(204).send();
  });

  /* ================= CHATS ================= */

  app.get(api.chats.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const chats = await storage.getChats(req.user!.id);
    res.json(chats);
  });

  app.post(api.chats.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();

    const chat = await storage.createChat({
      ...req.body,
      userId: req.user!.id,
    });

    res.status(201).json(chat);
  });

  app.get(api.chats.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();

    const id = Number(req.params.id);
    const chat = await storage.getChat(id);

    if (!chat || chat.userId !== req.user!.id)
      return res.status(404).send();

    const messages = await storage.getChatMessages(id);
    res.json({ ...chat, messages });
  });

  app.post(api.chats.sendMessage.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();

    const chatId = Number(req.params.id);
    const { content } = req.body;

    const chat = await storage.getChat(chatId);
    if (!chat || chat.userId !== req.user!.id)
      return res.status(404).send();

    await storage.createMessage({
      chatId,
      role: "user",
      content,
    });

    const doc = await storage.getDocument(chat.documentId);
    let context = "";

    if (doc?.chunks && Array.isArray(doc.chunks)) {
      const queryEmbedding = (
        await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: content,
        })
      ).data[0].embedding;

      const ranked = doc.chunks
        .map((chunk: any) => ({
          text: chunk.text,
          score: chunk.embedding.reduce(
            (sum: number, val: number, i: number) =>
              sum + val * queryEmbedding[i],
            0
          ),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      context = ranked.map(r => r.text).join("\n\n");
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant. Use this context if relevant:\n\n${context}`,
          },
          { role: "user", content },
        ],
        stream: true,
      });

      let fullResponse = "";

      for await (const part of stream) {
        const delta = part.choices[0]?.delta?.content;
        if (delta) {
          fullResponse += delta;
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
      }

      await storage.createMessage({
        chatId,
        role: "assistant",
        content: fullResponse,
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      console.error("Chat Error:", err);
      res.end();
    }
  });

  return httpServer;
}
