# DocMind Chat Feature - Complete Guide

## Overview
Your DocMind application now has a **fully functional chat interface** where users can interact with an AI bot to ask questions about their uploaded documents.

## How It Works

### 1. **Upload Documents**
- Go to **Documents** page
- Click "Upload Files" or drag & drop files
- Supported formats: PDF, TXT (up to 200MB each)
- Files are automatically processed and embedded into ChromaDB

### 2. **Start a Chat**
There are multiple ways to start chatting:

#### Option A: From Documents Page
- After uploading, you'll see each document with a **"Chat" button**
- Click the "Chat" button next to any document
- A new chat session is created automatically
- You're redirected to the Chat page with the conversation loaded

#### Option B: From Chat Page
- Navigate to **Chat** in the sidebar
- See the "Start New Chat" section on the left
- Click the **+ button** next to any document
- Start asking questions immediately

#### Option C: From History
- Go to **History** page
- See all your past conversations
- Click "Resume Chat" to continue a previous conversation

### 3. **Chat Interface Features**

#### **Message Input**
- Type your question in the input box at the bottom
- Click the Send button or press Enter
- Bot responds based on document content

#### **Suggested Prompts** (when chat is empty)
- 💡 Summarize this document
- 📌 What are the key points?
- 📚 Explain the main concepts

Click any suggestion to auto-fill the input field.

#### **Real-time Responses**
- User messages appear on the **right** (purple/primary color)
- Bot responses appear on the **left** (green accent)
- Animated "typing" indicator while bot is processing
- Timestamps on each message

#### **Auto-scroll**
- Messages automatically scroll to the latest
- Keeps conversation flow natural

### 4. **Chat History**
- All conversations are saved to the database
- Linked to your user account via email
- Persistent across sessions (survives page refresh)
- View all past chats in the **History** page

## Technical Architecture

### **Backend (Python RAG Service)**
- **File**: `server/rag.py`
- **Embedding Model**: `sentence-transformers/all-MiniLM-L6-v2`
- **LLM**: `meta-llama/Llama-3.2-1B-Instruct` via HuggingFace
- **Vector Store**: ChromaDB (local persistent storage)
- **Document Processing**: 
  - PDFs parsed with PyPDFLoader
  - Text files parsed with TextLoader
  - Split into 800-character chunks with 150-char overlap
  - Each chunk embedded and stored with source metadata

### **Backend (Node.js API)**
- **File**: `server/routes.ts`
- **Upload Endpoint**: `/api/documents/upload` (accepts multiple files)
- **Chat Endpoint**: `/api/chats/:id/messages`
  - Saves user message to DB
  - Calls Python RAG script with query
  - Filters by source document
  - Saves bot response to DB
  - Returns message to frontend

### **Frontend (React)**
- **Chat Page**: `client/src/pages/dashboard/Chat.tsx`
- **Features**:
  - Sidebar with conversation list
  - Main chat area with message bubbles
  - Input field with send button
  - Mobile responsive design
  - Real-time message updates via React Query

### **Database Schema**
- **Users**: Stores user info (email, etc.)
- **Documents**: Metadata about uploaded files (name, size, path)
- **Chats**: Conversation sessions (title, documentId, userId)
- **Messages**: Individual messages (chatId, role, content, timestamp)

## User Flow Diagram

```
1. Login → Dashboard
2. Navigate to Documents
3. Upload PDF/TXT → Processing (embedding into ChromaDB)
4. Click "Chat" button
5. New chat created → Chat page opens
6. Type question → Bot analyzes document
7. Receive AI-generated answer
8. Continue conversation
9. View history anytime
```

## Key Features

✅ **Multi-document support**: Upload and chat with multiple documents
✅ **Persistent storage**: All data saved in MySQL database
✅ **Document-specific answers**: Bot filters by source document
✅ **Chat history**: View and resume past conversations
✅ **Beautiful UI**: Modern glassmorphism design with smooth animations
✅ **Mobile responsive**: Works on all devices
✅ **Large file support**: Up to 200MB per file
✅ **Real-time feedback**: Loading states and typing indicators

## Example Queries

Once you start a chat, try asking:
- "Summarize this document in 3 bullet points"
- "What is the main topic of this document?"
- "Explain [specific concept] mentioned in the document"
- "What are the key takeaways?"
- "Who is the author and what is their main argument?"

## Troubleshooting

### Chat not responding?
- Check terminal for Python errors
- Ensure HuggingFace API token is set in `.env`
- Verify ChromaDB directory exists and is writable

### Documents not appearing?
- Check database connection
- Run `npm run dev` to restart server
- Check browser console for errors

### History not showing?
- Ensure you're logged in
- Chats are user-specific (linked by email)
- Refresh the page

## Next Steps

You can enhance the system with:
- Citation tracking (show which page/section the answer came from)
- Multi-turn conversations with context
- Export chat as PDF
- Share conversations
- Voice input/output
- Multiple language support
