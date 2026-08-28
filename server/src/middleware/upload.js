import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';

const allowed = new Map([['image/jpeg', '.jpg'], ['image/png', '.png'], ['image/webp', '.webp']]);
const storage = multer.diskStorage({
  destination: path.resolve('uploads'),
  filename: (_req, file, callback) => callback(null, `${Date.now()}-${crypto.randomUUID()}${allowed.get(file.mimetype) || ''}`)
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 4 },
  fileFilter: (_req, file, callback) => allowed.has(file.mimetype)
    ? callback(null, true)
    : callback(new Error('Only JPG, PNG, and WEBP images are allowed'))
});
