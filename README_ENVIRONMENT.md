# Python Environment Setup

The chatbot uses a Python backend for RAG (Retrieval-Augmented Generation). A virtual environment has been set up to manage its dependencies.

## Manual Setup (If needed)

If you need to recreate the environment:

1.  **Create the environment**:
    ```bash
    python -m venv venv
    ```

2.  **Activate it**:
    *   Windows: `.\venv\Scripts\activate`
    *   Mac/Linux: `source venv/bin/activate`

3.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

## Environment Variables
Ensure your `.env` file contains:
```env
HUGGINGFACEHUB_API_TOKEN=your_token_here
```

## Running the backend manually
You can test the backend directly:
```bash
.\venv\Scripts\python server/rag.py chat --query "Hello"
```
