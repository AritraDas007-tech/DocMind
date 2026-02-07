import os
import sys
import json
import argparse
from dotenv import load_dotenv
from PyPDF2 import PdfReader
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document
from huggingface_hub import InferenceClient

# Load environment variables
load_dotenv()
# Strictly use HUGGINGFACEHUB_API_TOKEN as requested
HF_TOKEN = os.getenv("HUGGINGFACEHUB_API_TOKEN")

PERSIST_DIRECTORY = "./chroma_db"

def get_vectorstore():
    """Initialize or load the Chroma vector database."""
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={'device': 'cpu'},
        encode_kwargs={'normalize_embeddings': False},
        multi_process=False
    )
    # Ensure HUGGINGFACEHUB_API_TOKEN is set in environment for embeddings as well
    if HF_TOKEN:
        os.environ["HUGGINGFACEHUB_API_TOKEN"] = HF_TOKEN
        
    return Chroma(
        persist_directory=PERSIST_DIRECTORY,
        embedding_function=embeddings
    )

def ingest_file(file_path):
    """Process a file (PDF or Text) and add its contents to the vector database."""
    try:
        if not HF_TOKEN:
            return {"status": "error", "message": "HUGGINGFACEHUB_API_TOKEN is missing in .env"}

        filename = os.path.basename(file_path)
        if file_path.lower().endswith('.pdf'):
            text = ""
            with open(file_path, 'rb') as f:
                reader = PdfReader(f)
                for page in reader.pages:
                    content = page.extract_text()
                    if content:
                        text += content
            
            # Optimized splitting for better RAG performance
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            chunks = text_splitter.split_text(text)
            splits = [Document(page_content=c, metadata={"source": filename}) for c in chunks]
        else:
            from langchain_community.document_loaders import TextLoader
            loader = TextLoader(file_path, encoding='utf-8')
            docs = loader.load()
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            splits = text_splitter.split_documents(docs)
            for doc in splits:
                doc.metadata["source"] = filename

        vectorstore = get_vectorstore()
        vectorstore.add_documents(splits)
        return {"status": "success", "chunks": len(splits), "file": filename}
    except Exception as e:
        return {"status": "error", "message": f"Ingestion failed: {str(e)}"}

def format_docs(docs):
    """Format retrieved documents for the prompt context."""
    if not docs:
        return "No relevant context found."
    return "\n\n".join(doc.page_content for doc in docs)

def chat(query, history=[], source_filter=None):
    """Main chat logic with history and filtering."""
    try:
        if not HF_TOKEN:
            return {"status": "error", "message": "HUGGINGFACEHUB_API_TOKEN is missing in .env"}

        # 1. Initialize Vector Store
        vectorstore = get_vectorstore()
        
        # 2. Setup Filtered Retriever
        search_kwargs = {"k": 4}
        if source_filter:
            if isinstance(source_filter, list):
                if len(source_filter) == 1:
                    search_kwargs["filter"] = {"source": source_filter[0]}
                else:
                    search_kwargs["filter"] = {"$or": [{"source": src} for src in source_filter]}
            else:
                search_kwargs["filter"] = {"source": source_filter}
        
        retriever = vectorstore.as_retriever(search_kwargs=search_kwargs)

        # 3. Retrieve and Format Context
        docs = retriever.invoke(query)
        context = format_docs(docs)

        # 4. Mistral Prompt Template with History
        history_context = ""
        for msg in history:
            if msg["role"] == "user":
                history_context += f"[INST] {msg['content']} [/INST]"
            else:
                history_context += f" {msg['content']} "

        prompt = f"""<s>[INST] You are DocMind, an intelligent document analysis assistant. 
Answer the question based strictly on the provided Context. 
If the information is not in the context, say: "I'm sorry, I don't see that information in the uploaded documents."
Keep your answers professional and concise. [/INST] {history_context} [INST]
Context:
{context}

Question:
{query} [/INST]"""
        
        # 5. Direct Inference Client Call (Modern Chat Interface)
        client = InferenceClient(model="mistralai/Mistral-7B-Instruct-v0.2", token=HF_TOKEN)
        
        # Prepare messages for Chat Completion
        messages = [
            {"role": "system", "content": "You are DocMind, an intelligent document analysis assistant. Answer strictly based on the provided context."}
        ]
        
        # Add history to messages
        for msg in history:
            role = "assistant" if msg["role"] == "assistant" else "user"
            messages.append({"role": role, "content": msg["content"]})
            
        # Add current context and query
        messages.append({"role": "user", "content": f"Context:\n{context}\n\nQuestion:\n{query}"})
        
        response = client.chat_completion(
            messages=messages,
            max_tokens=1000,
            temperature=0.1,
        )
        
        answer = response.choices[0].message.content
        return {"status": "success", "answer": answer.strip()}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": f"Chat error: {str(e)}"}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command")
    
    # Ingest command
    ingest_parser = subparsers.add_parser("ingest")
    ingest_parser.add_argument("files", nargs="+")
    
    # Chat command
    chat_parser = subparsers.add_parser("chat")
    chat_parser.add_argument("--query", required=True)
    chat_parser.add_argument("--filter", help="Filename or JSON list of filenames")
    chat_parser.add_argument("--history", help="Chat history as JSON string")
    
    args = parser.parse_args()
    
    if args.command == "ingest":
        results = []
        for file_path in args.files:
            results.append(ingest_file(file_path))
        print(json.dumps(results))
        
    elif args.command == "chat":
        source_filter = args.filter
        if source_filter:
            try:
                parsed = json.loads(source_filter)
                if isinstance(parsed, list):
                    source_filter = parsed
            except:
                pass
        
        history = []
        if args.history:
            try:
                history = json.loads(args.history)
            except:
                pass
        
        result = chat(args.query, history=history, source_filter=source_filter)
        print(json.dumps(result))
