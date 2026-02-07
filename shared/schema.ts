import { mysqlTable, serial, text, varchar, int, boolean, timestamp, json, longtext } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  isVerified: boolean("is_verified").default(false),
  otp: varchar("otp", { length: 6 }), // Store hashed OTP or simple OTP for demo
  createdAt: timestamp("created_at").defaultNow(),
});

export const documents = mysqlTable("documents", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(), // No foreign key constraint for simplicity in Lite
  name: text("name").notNull(),
  size: int("size").notNull(),
  url: text("url").notNull(),
  content: longtext("content"), // Extracted text - using longtext for large content
  chunks: json("chunks"), // Array of { text: string, embedding: number[] }
  createdAt: timestamp("created_at").defaultNow(),
});

export const chats = mysqlTable("chats", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  documentId: int("document_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  lastActivity: timestamp("last_activity").defaultNow(),
});

export const messages = mysqlTable("messages", {
  id: serial("id").primaryKey(),
  chatId: int("chat_id").notNull(),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: longtext("content").notNull(), // using longtext for large messages just in case
  sourcePage: int("source_page"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  isVerified: true,
  otp: true,
  createdAt: true
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true
});

export const insertChatSchema = createInsertSchema(chats).omit({
  id: true,
  createdAt: true,
  lastActivity: true
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true
});

// === TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Chat = typeof chats.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Auth types
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const signupSchema = insertUserSchema;

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export const resendOtpSchema = z.object({
  email: z.string().email(),
});

// Document types
export interface Chunk {
  text: string;
  embedding: number[];
  page?: number;
}
