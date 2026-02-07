import type { Express } from "express";
import { type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import multer from "multer";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =====================================================
   FILE UPLOAD CONFIG
===================================================== */
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(__dirname, "../uploads");
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (err) {
        cb(err as Error, "");
      }
    },
    filename: (req, file, cb) => {
      const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + cleanName);
    }
  }),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
});

/* =====================================================
   PYTHON BRIDGE
===================================================== */
async function runPythonCommand(command: string, args: string[]): Promise<any> {
  const rootDir = path.resolve(__dirname, "..");
  const venvPython = path.join(rootDir, "venv", "Scripts", "python.exe");

  // Check if venv exists synchronously to avoid await issues in Promise executor
  let pythonExecutable = "python";
  try {
    const fsSync = await import("fs");
    if (fsSync.existsSync(venvPython)) {
      pythonExecutable = venvPython;
    }
  } catch (e) {
    // Fallback to "python"
  }

  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(pythonExecutable, ["server/rag.py", command, ...args], { cwd: rootDir });

    let dataString = "";
    let errorString = "";

    pythonProcess.stdout.on("data", (data) => {
      dataString += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorString += data.toString();
    });

    pythonProcess.on("close", (code) => {
      // 1. Check for non-zero exit code
      if (code !== 0) {
        console.error("Python Error Output:", errorString);
        console.error("Python Standard Output:", dataString);
        reject(new Error(`Python script exited with code ${code}. Error: ${errorString || dataString}`));
        return;
      }

      // 2. Parse Valid JSON
      try {
        // Find the last non-empty line
        const lines = dataString.trim().split('\n');
        const nonEmptyLines = lines.filter(l => l.trim().length > 0);

        if (nonEmptyLines.length === 0) {
          console.error("Empty output from python script", errorString);
          // If we have output in errorString but exit code 0, maybe it just printed there? 
          // Unlikely for json output.
          if (errorString) {
            // Try to see if error string has the json?
            // No, usually not.
          }
          throw new Error("No output content received from python script");
        }

        const lastLine = nonEmptyLines[nonEmptyLines.length - 1];
        console.log("Parsing Python Response:", lastLine);
        const jsonResponse = JSON.parse(lastLine);
        resolve(jsonResponse);
      } catch (e: any) {
        console.error("Failed to parse JSON:", dataString);
        reject(new Error(`Failed to parse response: ${e.message}. Raw: ${dataString}`));
      }
    });
  });
}

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
    try {
      const docs = await storage.getDocuments(req.user!.id);
      res.json(docs);
    } catch (e: any) {
      console.error("Error fetching documents:", e);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  /* ========== MULTIPLE FILE UPLOAD ========== */
  app.post(
    api.documents.upload.path,
    upload.array("files"),
    async (req, res) => {
      if (!req.isAuthenticated())
        return res.status(401).json({ message: "Unauthorized" });

      const files = req.files as Express.Multer.File[] | undefined;

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      try {
        const filePaths = files.map(f => f.path);

        console.log("Processing files:", filePaths);

        // Call Python script to ingest
        const ingestResults = await runPythonCommand("ingest", filePaths);

        // ingestResults must be an array
        const resultsArray = Array.isArray(ingestResults) ? ingestResults : [ingestResults];

        const createdDocs = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const result = resultsArray[i]; // Result matches index

          if (result && result.status === "success") {
            const doc = await storage.createDocument({
              userId: (req.user as any).id,
              name: file.originalname,
              size: file.size,
              url: file.path,
              content: JSON.stringify(result),
              chunks: [],
            });
            createdDocs.push(doc);
          } else {
            console.error(`Failed to ingest ${file.originalname}:`, result);
            // We could choose to fail distinct files or all. 
            // For now, let's continue.
          }
        }

        res.status(201).json(createdDocs);
      } catch (err: any) {
        console.error("Upload/Processing Error:", err);
        res.status(500).json({ message: "Failed to process documents: " + err.message });
      }
    }
  );

  app.delete(api.documents.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    try {
      await storage.deleteDocument(Number(req.params.id));
      res.status(204).send();
    } catch (e) {
      res.status(500).send();
    }
  });

  /* ================= CHATS ================= */

  app.get(api.chats.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const chats = await storage.getChats((req.user as any).id);
    res.json(chats);
  });

  app.post(api.chats.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();

    const chat = await storage.createChat({
      ...req.body,
      userId: (req.user as any).id,
    });

    res.status(201).json(chat);
  });

  app.get(api.chats.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();

    const id = Number(req.params.id);
    const chat = await storage.getChat(id);

    if (!chat || chat.userId !== (req.user as any).id)
      return res.status(404).send();

    const messages = await storage.getChatMessages(id);
    res.json({ ...chat, messages });
  });

  app.delete(api.chats.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();

    const id = Number(req.params.id);
    const chat = await storage.getChat(id);

    if (!chat || chat.userId !== (req.user as any).id)
      return res.status(404).send();

    await storage.deleteChat(id);
    res.json({ message: "Chat deleted successfully" });
  });

  app.post(api.chats.sendMessage.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();

    const chatId = Number(req.params.id);
    const { content, documentIds } = req.body;

    const chat = await storage.getChat(chatId);
    if (!chat || chat.userId !== (req.user as any).id)
      return res.status(404).send();

    // Get previous messages for context (limit to last 10)
    const previousMessages = await storage.getChatMessages(chatId);
    const history = previousMessages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    await storage.createMessage({
      chatId,
      role: "user",
      content,
    });

    // Determine filter based on provided documentIds or fallback to chat's documentId
    let sourceFilter: string | string[] | undefined = undefined;

    if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      // User selected specific documents
      const docs = await Promise.all(
        documentIds.map(id => storage.getDocument(id))
      );
      const validDocs = docs.filter(d => d && d.url);
      if (validDocs.length > 0) {
        sourceFilter = validDocs.map(d => path.basename(d!.url));
      }
    } else {
      // Fallback to chat's primary document
      const doc = await storage.getDocument(chat.documentId);
      if (doc && doc.url) {
        sourceFilter = path.basename(doc.url);
      }
    }

    try {
      const args = ["--query", content];
      if (sourceFilter) {
        if (Array.isArray(sourceFilter)) {
          args.push("--filter", JSON.stringify(sourceFilter));
        } else {
          args.push("--filter", sourceFilter);
        }
      }

      // Pass history
      if (history.length > 0) {
        args.push("--history", JSON.stringify(history));
      }

      const result = await runPythonCommand("chat", args);

      let answer = "";
      if (result.status === "error") {
        answer = "Error: " + result.message;
      } else {
        answer = result.answer;
      }

      const message = await storage.createMessage({
        chatId,
        role: "assistant",
        content: answer,
      });

      res.json(message);
    } catch (err: any) {
      console.error("Chat Error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  return httpServer;
}
