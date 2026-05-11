# Chatbot Troubleshooting Guide

## Error: "Cannot connect to RAG backend at http://localhost:8000"

This error means the frontend cannot reach the RAG (backend) server.

### Quick Fix (Choose one):

#### Option 1: Start Everything Properly (Recommended)

**Windows:**
```cmd
cd C:\Company project\INSURANCE-PROJECT-main
start-chatbot.bat
```

**Mac/Linux:**
```bash
cd /path/to/INSURANCE-PROJECT-main
chmod +x start-chatbot.sh
./start-chatbot.sh
```

---

#### Option 2: Manual Startup (3 separate terminals)

**Terminal 1 - RAG Backend (Python):**
```bash
cd server/rag-for-beginners
python main.py
# or python3 main.py on Mac/Linux

# You should see: INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Terminal 2 - Frontend (React):**
```bash
cd client
npm run dev

# You should see: ➜  Local:   http://localhost:5173/
```

**Terminal 3 - Node Backend (Optional, only if you need it):**
```bash
cd server
npm start
```

---

## Verification Checklist

### ✅ Check 1: RAG Backend is Running

In any terminal, run:
```bash
curl http://localhost:8000/health
```

**Expected response:**
```json
{
  "status": "ok",
  "service": "RAG API",
  "rag_available": true
}
```

**If you get "Connection refused":**
- RAG backend is NOT running
- Go back and start Terminal 1 above

### ✅ Check 2: Frontend is Running

Open your browser and go to:
```
http://localhost:5173
```

You should see the PolicyHub chatbot UI.

**If you see "Connection refused" or "Site can't be reached":**
- Frontend is NOT running
- Go back and start Terminal 2 above

### ✅ Check 3: Test the Chat

1. Go to `http://localhost:5173`
2. Click on "🏥 Health" button
3. Wait for the response

**Expected:**
- Shows typing indicator (animated 3 dots)
- Displays a relevant health insurance answer

**If you see error message:**
- Check Steps 1 and 2 above
- Look at the browser console (F12 → Console tab) for error details

---

## Browser Console Debugging

Open your browser's Developer Tools: **F12** or **Ctrl+Shift+I**

Go to **Console** tab and look for messages like:

```
[RAG] Querying backend at http://localhost:8000/query
[RAG] Got response: { answer: "..." }
```

**If you see errors like:**
```
[RAG] Network error - cannot reach backend: Failed to fetch
```

→ RAG backend is not running (see Check 1 above)

```
[RAG] Request timed out after 10 seconds
```

→ RAG backend is too slow (may need more resources or optimization)

---

## Common Issues & Solutions

### Issue 1: Port 8000 is Already in Use

**Error:** `OSError: [Errno 48] Address already in use` or `Port 8000 is already in use`

**Solution:**
```bash
# Find what's using port 8000
Windows: netstat -ano | findstr :8000
Mac/Linux: lsof -i :8000

# Kill the process (replace PID with actual process ID)
Windows: taskkill /PID <PID> /F
Mac/Linux: kill -9 <PID>

# Or use a different port:
RAG_PORT=9000 python main.py
# Then update frontend: VITE_RAG_API_URL=http://localhost:9000
```

### Issue 2: "Cannot import rag_answer_simple"

**Error:** `ImportError: cannot import name 'get_answer' from 'rag_answer_simple'`

**Solution:**
```bash
cd server/rag-for-beginners
pip install -r requirements.txt
# Make sure all dependencies are installed
```

### Issue 3: Python Not Found

**Error:** `python: command not found` or `No such file or directory`

**Solution:**
```bash
# Check if Python is installed
python --version        # Windows
python3 --version       # Mac/Linux

# If not installed, download from https://www.python.org
# Make sure to check "Add Python to PATH" during installation
```

### Issue 4: npm Not Found

**Error:** `npm: command not found`

**Solution:**
```bash
# Check if Node.js is installed
node --version
npm --version

# If not installed, download from https://nodejs.org
# npm comes with Node.js installation
```

### Issue 5: "Qdrant collection not found"

**Error:** `RuntimeError: Collection 'company_docs' not found`

**Solution:**
```bash
cd server/rag-for-beginners

# Ingest documents into Qdrant
python ingestion_pipeline.py

# This will populate the vector database with insurance policy documents
```

---

## Testing Different Scenarios

### Test 1: Direct API Call

```bash
# Test the RAG backend directly
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is health insurance?"}'

# Expected response:
# {
#   "answer": "Health insurance provides coverage for medical expenses..."
# }
```

### Test 2: Test Free Text Input

1. Go to `http://localhost:5173`
2. Type in the text box: "What are the benefits?"
3. Click the send button (➤)
4. Wait for response

### Test 3: Test Chip Clicks

1. Go to `http://localhost:5173`
2. Click "🏥 Health" chip
3. Wait for health subcategories to appear
4. Click any subcategory chip
5. Wait for answer and follow-up chips

---

## Performance Tips

### If responses are slow (>3 seconds):

1. **RAG backend is loading models for the first time**
   - First query is slow (can take 5-10 seconds)
   - Subsequent queries are faster

2. **System doesn't have enough RAM**
   - Close other applications
   - RAG model requires ~2GB RAM

3. **Vector database is large**
   - Check `server/qdrant_data` size
   - Consider optimizing document ingestion

### If you want to run on different ports:

```bash
# Frontend on port 3000
cd client
npm run dev -- --port 3000

# RAG backend on port 9000
cd server/rag-for-beginners
RAG_PORT=9000 python main.py

# Update frontend config
echo "VITE_RAG_API_URL=http://localhost:9000" > client/.env.local
```

---

## Still Having Issues?

1. **Check all three terminals** are running and not showing errors
2. **Look at browser console** (F12 → Console) for JavaScript errors
3. **Check terminal logs** where you started RAG backend for Python errors
4. **Verify ports** are not already in use (use Check 1 above)
5. **Restart everything** - stop all services and start again

---

## How to Report Issues

If you still have problems, provide:
1. What terminal shows (copy the full error message)
2. Browser console errors (F12 → Console)
3. Which command failed (start backend, start frontend, etc.)
4. What OS you're using (Windows/Mac/Linux)
5. Results of `curl http://localhost:8000/health`
