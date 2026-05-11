const path = require('path');
const fs = require('fs');
const multer = require('multer');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'scratch', 'uploads');

// Ensure upload directory exists
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const quoteId = req.params.quoteId || 'unknown';
    const dir = path.join(UPLOAD_ROOT, quoteId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_%()\[\] ]/g, '_');
    cb(null, `${timestamp}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const uploadQuoteDocuments = [
  upload.array('files', 10),
  (req, res) => {
    try {
      const quoteId = req.params.quoteId;
      const files = (req.files || []).map((f) => ({ originalName: f.originalname, savedAs: f.filename, path: f.path }));

      // Minimal response — in a real app we'd persist metadata to DB and attach to user's application
      res.json({ success: true, message: 'Files uploaded', quoteId, files });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ success: false, message: 'Failed to upload files' });
    }
  }
];

module.exports = { uploadQuoteDocuments };
