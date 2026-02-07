import {
  users,
  documents,
  chats,
  messages,
  type User,
  type InsertUser,
  type Document,
  type InsertDocument,
  type Chat,
  type InsertChat,
  type Message,
  type InsertMessage,
} from "@shared/schema";

import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import session from "express-session";

export interface IStorage {
  sessionStore: session.Store;

  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  verifyUser(id: number): Promise<void>;

  createDocument(doc: InsertDocument): Promise<Document>;
  getDocuments(userId: number): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<void>;

  createChat(chat: InsertChat): Promise<Chat>;
  getChats(userId: number): Promise<Chat[]>;
  getChat(id: number): Promise<Chat | undefined>;
  getChatMessages(chatId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteChat(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new session.MemoryStore();
  }

  // ================= USERS =================
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result: any = await db.insert(users).values(insertUser);
    const insertId = result[0]?.insertId;

    const [user] = await db.select().from(users).where(eq(users.id, insertId));
    return user;
  }

  async verifyUser(id: number): Promise<void> {
    await db.update(users).set({ isVerified: true }).where(eq(users.id, id));
  }

  // ================= DOCUMENTS =================
  async createDocument(doc: InsertDocument): Promise<Document> {
    const result: any = await db.insert(documents).values(doc);
    const insertId = result[0]?.insertId;

    const [newDoc] = await db.select().from(documents).where(eq(documents.id, insertId));
    return newDoc;
  }

  async getDocuments(userId: number): Promise<Document[]> {
    return db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt));
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // ================= CHATS =================
  async createChat(chat: InsertChat): Promise<Chat> {
    const result: any = await db.insert(chats).values(chat);
    const insertId = result[0]?.insertId;
    console.log("Chat created, insertId:", insertId);

    const [newChat] = await db.select().from(chats).where(eq(chats.id, insertId));
    return newChat;
  }

  async getChats(userId: number): Promise<Chat[]> {
    return db
      .select()
      .from(chats)
      .where(eq(chats.userId, userId))
      .orderBy(desc(chats.lastActivity));
  }

  async getChat(id: number): Promise<Chat | undefined> {
    const [chat] = await db.select().from(chats).where(eq(chats.id, id));
    return chat;
  }

  async getChatMessages(chatId: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result: any = await db.insert(messages).values(message);
    const insertId = result[0]?.insertId;

    await db
      .update(chats)
      .set({ lastActivity: new Date() })
      .where(eq(chats.id, message.chatId));

    const [newMessage] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, insertId));

    return newMessage;
  }

  async deleteChat(id: number): Promise<void> {
    await db.delete(messages).where(eq(messages.chatId, id));
    await db.delete(chats).where(eq(chats.id, id));
  }
}

export const storage = new DatabaseStorage();
