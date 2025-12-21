import { Router } from "express";
import { jwtMiddleware } from "../middleware/jwt";
import multer from "multer";
import path from "path";
import fs from "fs";
import prisma from "../db/prisma";

const router = Router();

router.get("/avatar/:userId", async (req, res) => {
    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ error: "user id is required" });
    if (isNaN(+userId)) return res.status(400).json({ error: "user id must be a number" });
    console.log(userId)

    const user = await prisma.user.findUnique({
        where: { id: +userId },
        select: {
            discordId: true,
            avatar: true,
            customAvatarUrl: true,
        },
    });
    if (!user) return res.status(404).json({ error: "user not found" });
    if (!user.avatar && !user.customAvatarUrl) return res.status(404).json({ error: "avatar not found" });
    if (user.customAvatarUrl) return res.sendFile(path.resolve("uploads/avatars/", user.customAvatarUrl));
    console.log(user.avatar)
    res.redirect(`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`);
});

export default router;
