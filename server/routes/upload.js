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
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf'
  ];
  if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(jpg|jpeg|png|webp|gif|pdf)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, GIF images and PDF documents are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter
});

const handleFileUpload = (req, res) => {
  try {
    const uploadedFile = req.file || (req.files && req.files[0]);
    if (!uploadedFile) {
      return res.status(400).json({ success: false, error: 'No file uploaded. Please select an image or PDF.' });
    }
    const fileUrl = `/uploads/${uploadedFile.filename}`;
    res.json({
      success: true,
      message: 'File uploaded successfully.',
      fileUrl,
      photo_url: fileUrl,
      filename: uploadedFile.filename,
      originalName: uploadedFile.originalname,
      isPdf: uploadedFile.mimetype === 'application/pdf' || uploadedFile.filename.endsWith('.pdf')
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error during upload.' });
  }
};

// Accept uploads at root POST /api/upload and /photo, /file, /document
router.post('/', upload.any(), handleFileUpload);
router.post('/photo', upload.any(), handleFileUpload);
router.post('/file', upload.any(), handleFileUpload);
router.post('/document', upload.any(), handleFileUpload);

// POST /api/upload/base64 - Upload photo or PDF document as base64 string
router.post('/base64', (req, res) => {
  try {
    const { base64, extension, originalName } = req.body;
    if (!base64) {
      return res.status(400).json({ success: false, error: 'No base64 data provided.' });
    }

    // Strip any data URL prefix (e.g. data:image/png;base64, or data:application/pdf;base64,)
    const base64Data = base64.replace(/^data:[^;]+;base64,/, '');
    const ext = extension || (base64.startsWith('data:application/pdf') ? 'pdf' : 'jpg');
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const fileUrl = `/uploads/${filename}`;
    res.json({
      success: true,
      message: 'File uploaded successfully.',
      fileUrl,
      photo_url: fileUrl,
      filename,
      isPdf: ext.toLowerCase() === 'pdf'
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
