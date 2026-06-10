const multer = require('multer');
const path = require('path');

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const DOC_TYPES   = [...IMAGE_TYPES, 'application/pdf'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB (videos)

// Allowed mime types per form field.
const FIELD_RULES = {
  image:           IMAGE_TYPES, // main case image — images only
  proof_documents: DOC_TYPES,   // official documents — PDF or scanned image
  proof_photos:    IMAGE_TYPES, // photo evidence
  proof_videos:    VIDEO_TYPES, // video evidence
};

// Proof field name → proof type stored in the DB.
const PROOF_FIELDS = {
  proof_documents: 'document',
  proof_photos:    'photo',
  proof_videos:    'video',
};

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`);
  },
});

function fileFilter(_req, file, cb) {
  const allowed = FIELD_RULES[file.fieldname];
  if (allowed && allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error(`Unsupported file type for "${file.fieldname}"`);
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
  }
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } });

module.exports = upload;
module.exports.PROOF_FIELDS = PROOF_FIELDS;
