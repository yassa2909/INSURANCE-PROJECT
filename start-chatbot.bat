@echo off
REM PolicyHub Chatbot - Windows Startup Script
REM This script starts all three services needed for the chatbot

echo.
echo ========================================
echo PolicyHub Insurance Chatbot
echo Starting all services...
echo ========================================
echo.

REM Store the main directory
set MAIN_DIR=%CD%

REM Check if we're in the right directory
if not exist "client" (
    echo Error: client directory not found. Please run this script from the project root.
    exit /b 1
)

echo [1/3] Starting RAG Backend (FastAPI) on port 8000...
echo.
cd server\rag-for-beginners
start "RAG Backend" cmd /k python main.py
timeout /t 3 /nobreak

echo [2/3] Starting Frontend (React) on port 5173...
echo.
cd %MAIN_DIR%\client
start "Frontend" cmd /k npm run dev
timeout /t 3 /nobreak

echo.
echo ========================================
echo Services started!
echo ========================================
echo.
echo Frontend:     http://localhost:5173
echo RAG Backend:  http://localhost:8000
echo.
echo The chatbot should be ready to use.
echo Close any of the cmd windows to stop the service.
echo.
echo For more information, see: README_CHATBOT_SETUP.md
echo.
timeout /t 5
