# PolicyHub Insurance Chatbot - Setup Guide

## System Architecture

The chatbot consists of three main components:

1. **Frontend** (React + Vite) - `client/`
2. **Backend API** (Node.js + Express) - `server/src/`
3. **RAG Backend** (Python + FastAPI) - `server/rag-for-beginners/`

## Prerequisites

- Node.js 16+ (for frontend and backend)
- Python 3.8+ (for RAG backend)
- npm or yarn (for Node packages)
- pip (for Python packages)

## Installation & Startup

### 1. **Start the RAG Backend (FastAPI) - Port 8000**

```bash
cd server/rag-for-beginners

# Install dependencies
pip install -r requirements.txt

# Start the server
python main.py
```

The RAG backend should start on `http://localhost:8000`

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 2. **Start the Frontend - Port 5173**

```bash
cd client

# Install dependencies (if not already done)
npm install

# Start dev server
npm run dev
```

The frontend should start on `http://localhost:5173`

### 3. **Start the Node.js Backend (Optional) - Port 5000**

```bash
cd server

# Install dependencies (if not already done)
npm install

# Start the server
npm start
```

## Configuration

### Frontend Configuration

If your RAG backend is running on a different port/host, create a `.env.local` file:

```bash
cd client
echo "VITE_RAG_API_URL=http://your-backend-host:your-port" > .env.local
```

Example for production:
```
VITE_RAG_API_URL=http://api.example.com:8000
```

### Backend Configuration

If you want to run the RAG server on a different port:

```bash
RAG_PORT=9000 python main.py
```

Then update the frontend configuration:
```
VITE_RAG_API_URL=http://localhost:9000
```

## Chatbot Features

### Welcome Screen
- Shows three main categories: 🏥 Health, 🚗 Motor, 🛡️ Life

### Health Insurance Flow
1. Click "🏥 Health"
2. Choose a subcategory:
   - 🏥 Hospitalization
   - 💊 OPD & Medicines
   - 🔬 Diagnostics & Lab
   - 👶 Maternity Cover
   - 🦷 Dental & Vision
   - 📋 File a Claim

3. Get relevant follow-up options

### Free Text Input
- Type any question in the input box
- System queries the RAG knowledge base
- Get answers from insurance policy documents

### Error Handling
- If backend is unreachable, you'll see: "Cannot connect to RAG backend"
- Click "🔄 Try Again" to retry
- Click "📞 Talk to Agent" for support
- Click "🏠 Main Menu" to restart

## Troubleshooting

### "Cannot connect to RAG backend"

**Check 1: Is the RAG backend running?**
```bash
curl http://localhost:8000/health
```

Should return: `{"status":"ok","service":"RAG API","rag_available":true}`

**Check 2: Is the frontend using the correct URL?**
- Check browser console for the RAG API URL
- Update `.env.local` if needed

**Check 3: CORS Issues**
- The RAG backend has CORS enabled for all origins
- If you get CORS errors, check that the backend is responding

### "Request timeout"

- RAG backend is slow to respond
- Check if the Qdrant vector database is properly loaded
- Check server logs for errors

### No answers from knowledge base

- Ensure your Qdrant vector database has documents loaded
- Check `server/qdrant_data/` directory exists
- Run the ingestion pipeline if needed:
  ```bash
  cd server/rag-for-beginners
  python ingestion_pipeline.py
  ```

## API Endpoints

### RAG Backend (FastAPI)

**Health Check**
```
GET /health
```

**Query Endpoint** (used by chatbot)
```
POST /query
Content-Type: application/json

{
  "question": "What is covered under health insurance?"
}

Response:
{
  "answer": "Health insurance covers hospitalization, treatment, and related medical expenses..."
}
```

**Legacy Chat Endpoint**
```
POST /api/chat
Content-Type: application/json

{
  "question": "Health",
  "user_id": "optional"
}

Response:
{
  "success": true,
  "question": "Health",
  "answer": "...",
  "user_id": "optional"
}
```

## Performance Notes

- First API call may be slow (800ms+) due to model loading
- Subsequent queries are faster
- Typing indicator shows for minimum 800ms to provide good UX
- Request timeout is 10 seconds

## Development Tips

1. **Browser Console Logs**: Check the browser's developer console (F12) for detailed logs prefixed with `[RAG]` and `[CHATBOT]`

2. **Network Tab**: Monitor the Network tab to see API requests and responses

3. **Python Backend Logs**: Check terminal where RAG backend is running for debug info

4. **Test Endpoints**: Use curl to test endpoints:
   ```bash
   curl -X POST http://localhost:8000/query \
     -H "Content-Type: application/json" \
     -d '{"question": "What is health insurance?"}'
   ```

## Stopping Services

- **Frontend**: Press `Ctrl+C` in the terminal
- **RAG Backend**: Press `Ctrl+C` in the terminal
- **Node Backend**: Press `Ctrl+C` in the terminal
