require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const routes = require('./routes/authRoutes');
const { createUsersTable } = require('./models/userModel');

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Something went wrong.' });
});

// ─── Bootstrap DB then export ─────────────────────────────────────────────────
createUsersTable().then(() => {
  console.log('📦 Database tables initialized');
}).catch((err) => {
  console.error('⚠️ Database initialization failed (Server still running):', err.message);
});

module.exports = app;
