import express from "express";
import prisma from "../db/prisma";

const router = express.Router();

function formatUser(user: any) {
  return {
    id: Number(user.id),
    username: user.username || "Unknown",
    avatar: user.avatar || null,
    customAvatar: user.customAvatar || false,
    customAvatarUrl: user.customAvatarUrl || null,
    isAdmin: user.isAdmin || false,
  };
}

router.get("/history", async (_req, res) => {
  try {
    const dbMessages = await (prisma as any).chatMessage.findMany({
      where: { channel: "general" },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: { user: true },
    });

    const messages = dbMessages.map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
      channel: msg.channel,
      user: formatUser(msg.user),
    }));

    res.json({ messages });
  } catch (err) {
    console.error("Error fetching chat history:", err);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

export default router;
