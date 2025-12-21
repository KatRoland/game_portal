import { Router } from "express";
import { jwtMiddleware } from "../middleware/jwt";
import { adminMiddleware } from "../middleware/admin";
import prisma from "../db/prisma";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

router.get('/playlists', jwtMiddleware, async (_req, res) => {
  try {
    const playlists = await prisma.sopPlaylist.findMany({ orderBy: { name: 'asc' } });
    res.json({ playlists });
  } catch (e) { res.status(500).json({ error: 'failed' }) }
});

router.get('/items', jwtMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const items = await prisma.sopPlaylistItem.findMany({ where: { playlistId: id }, orderBy: { position: 'asc' } });
    res.json({ items });
  } catch (e) { res.status(500).json({ error: 'failed' }) }
});

router.get('/items/:id', jwtMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = await prisma.sopPlaylistItem.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'not_found' });
    const fileName = item.fileUrl.split('/').pop();
    if (!fileName) return res.status(404).json({ error: 'file_not_found' });
    const filePath = path.join(__dirname, '..', '..', 'uploads', 'sop', fileName);
    res.sendFile(filePath);
  } catch (e) { res.status(500).json({ error: 'failed' }) }
});


router.post('/playlists', jwtMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'invalid' });
    const playlist = await prisma.sopPlaylist.create({ data: { name } });
    res.status(201).json({ playlist });
  } catch (e) { res.status(500).json({ error: 'failed' }) }
});

router.delete('/playlists/:id', jwtMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.sopPlaylist.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'failed' }) }
});

router.post('/playlists/:id/items', jwtMiddleware, adminMiddleware, async (req, res) => {
  try {
    const playlistId = Number(req.params.id);
    const { title, fileUrl, position } = req.body;
    if (!title || !fileUrl) return res.status(400).json({ error: 'invalid' });
    const item = await prisma.sopPlaylistItem.create({ data: { title, fileUrl, position: position ?? 0, playlistId } });
    res.status(201).json({ item });
  } catch (e) { res.status(500).json({ error: 'failed' }) }
});

router.delete('/playlists/:pid/items/:iid', jwtMiddleware, adminMiddleware, async (req, res) => {
  try {
    const iid = Number(req.params.iid);
    await prisma.sopPlaylistItem.delete({ where: { id: iid } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'failed' }) }
});


const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads/sop");
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
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
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
    const relativePath = `sop/${file.filename}`;
    return res.status(201).json({ fileUrl: relativePath });
  } catch (e) {
    return res.status(500).json({ error: 'upload_failed' });
  }
});

export default router;
