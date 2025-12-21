import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { jwtMiddleware } from "../middleware/jwt";

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads/image_round");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  }
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif'
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/upload', jwtMiddleware, upload.single('image'), async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'unauthenticated' });
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'no_file' });
    const relativePath = `image_round/${file.filename}`;
    return res.status(201).json({ fileUrl: relativePath });
  } catch (e) {
    return res.status(500).json({ error: 'upload_failed' });
  }
});

export default router;

