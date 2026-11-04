const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP and GIF images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

// POST /api/upload/photo - Upload photo via multipart/form-data
router.post('/photo', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded. Please select a JPEG or PNG image.' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      message: 'Photo uploaded successfully.',
      fileUrl,
      filename: req.file.filename
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error during upload.' });
  }
});

// POST /api/upload/base64 - Upload photo as base64 string (for browser-based capture)
router.post('/base64', (req, res) => {
  try {
    const { base64, extension } = req.body;
    if (!base64) {
      return res.status(400).json({ success: false, error: 'No base64 data provided.' });
    }

    // Strip data URL prefix if present
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    const ext = extension || 'jpg';
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const fileUrl = `/uploads/${filename}`;
    res.json({
      success: true,
      message: 'Photo uploaded successfully.',
      fileUrl,
      filename
    });
  } catch (err) {
    console.error('Base64 upload error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error during upload.' });
  }
});

// Error handler for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
  next();
});

module.exports = router;
