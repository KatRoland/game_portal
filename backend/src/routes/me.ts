import { Router } from "express";
import { jwtMiddleware } from "../middleware/jwt";
import multer from "multer";
import path from "path";
import fs from "fs";
import prisma from "../db/prisma";

const router = Router();

router.get("/", jwtMiddleware, async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "unauthenticated" });
  const safe = {
    id: user.id,
    discordId: user.discordId,
    username: user.username,
    discriminator: user.discriminator,
    avatar: user.avatar,
    email: user.email,
    isAdmin: (user as any).isAdmin ?? false,
    customAvatar: (user as any).customAvatar ?? false,
    customAvatarUrl: (user as any).customAvatarUrl ?? null,
    createdAt: user.createdAt,
  };
  return res.json({ user: safe });
});
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/avatars";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const user = (req as any).user;
    const ext = path.extname(file.originalname);
    cb(null, `${user.id}${ext}`);
  },
});

const upload = multer({ storage });

router.post("/avatar", jwtMiddleware, upload.single("avatar"), async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "unauthenticated" });
  if (!req.file) return res.status(400).json({ error: "avatar file is required" });

  const filename = req.file.filename;
  await prisma.user.update({
    where: { id: user.id },
    data: ({
      customAvatarUrl: filename,
      customAvatar: true,
    } as any),
  });

  return res.json({ user: { customAvatarUrl: filename } });
});

export default router;
