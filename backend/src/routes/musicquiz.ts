import { Router } from "express";
import { jwtMiddleware } from "../middleware/jwt";
import { adminMiddleware } from "../middleware/admin";
import prisma from "../db/prisma";
import path from "path";
import fs from "fs";

const router = Router();

router.get("/playlists", jwtMiddleware, async (req, res) => {

  if (!process.env.FRONTEND_REFERER) {
    res.status(500).json({ error: "Frontend referer not configured" })
    return
  }

  const referer = req.headers.referer;
  if (!referer || !referer.includes(process.env.FRONTEND_REFERER)) {
    res.status(403).json({ error: "forbidden" })
    return
  }

  try {
    const playlists = await prisma.musicQuizPlaylist.findMany({
      orderBy: { name: "asc" }
    });

    return res.status(200).json({ playlists });
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return res.status(500).json({ error: "Failed to fetch playlists" });
  }
});

router.get("/tracks/:id", jwtMiddleware, async (req, res) => {
  try {
    const trackId = req.params.id;

    if (!process.env.FRONTEND_REFERER) {
      res.status(500).json({ error: "Frontend referer not configured" })
      return
    }

    const referer = req.headers.referer;
    if (!referer || !referer.includes(process.env.FRONTEND_REFERER)) {
      res.status(403).json({ error: "forbidden" })
      return
    }

    if (!trackId) {
      res.status(404).json({ error: "no id provided!" })
      return
    }

    const track = await prisma.musicQuizTrack.findFirst({
      where: {
        fileUrl: {
          contains: trackId
        }
      }
    })

    if (!track) {
      res.status(404).json({ error: "not found" })
      return
    }

    const filePath = path.join(__dirname, "../../uploads/", track.fileUrl);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.sendFile(filePath);

  } catch (error) {
    console.error("Error fetching track:", error);
    return res.status(500).json({ error: "Failed to fetch track" });
  }
})

router.post("/playlists", jwtMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Name is required" });
    }

    const existingPlaylist = await prisma.musicQuizPlaylist.findUnique({
      where: { name }
    });

    if (existingPlaylist) {
      return res.status(409).json({ error: "Playlist with this name already exists" });
    }

    const playlist = await prisma.musicQuizPlaylist.create({
      data: { name }
    });

    return res.status(201).json({ playlist });
  } catch (error) {
    console.error("Error creating playlist:", error);
    return res.status(500).json({ error: "Failed to create playlist" });
  }
});

router.delete("/playlists/:id", jwtMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid playlist ID" });
    }

    const playlist = await prisma.musicQuizPlaylist.findUnique({
      where: { id }
    });

    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    await prisma.musicQuizPlaylistTrack.deleteMany({
      where: { playlistId: id }
    });
    const gameModePlaylist = await prisma.gameModePlaylist.findUnique({
      where: { musicQuizPlaylistId: id }
    });

    if (gameModePlaylist) {
      await prisma.gameModePlaylist.update({
        where: { id: gameModePlaylist.id },
        data: { musicQuizPlaylistId: null }
      });
    }

    await prisma.musicQuizPlaylist.delete({
      where: { id }
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting playlist:", error);
    return res.status(500).json({ error: "Failed to delete playlist" });
  }
});

router.post("/playlists/:id/tracks", jwtMiddleware, adminMiddleware, async (req, res) => {
  try {
    const playlistId = parseInt(req.params.id);
    const { trackId } = req.body;

    if (isNaN(playlistId) || !trackId || isNaN(parseInt(trackId))) {
      return res.status(400).json({ error: "Invalid playlist ID or track ID" });
    }

    const playlist = await prisma.musicQuizPlaylist.findUnique({
      where: { id: playlistId }
    });

    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    const track = await prisma.musicQuizTrack.findUnique({
      where: { id: parseInt(trackId) }
    });

    if (!track) {
      return res.status(404).json({ error: "Track not found" });
    }

    const existingAssociation = await prisma.musicQuizPlaylistTrack.findFirst({
      where: {
        playlistId,
        trackId: parseInt(trackId)
      }
    });

    if (existingAssociation) {
      return res.status(409).json({ error: "Track already in playlist" });
    }

    const association = await prisma.musicQuizPlaylistTrack.create({
      data: {
        playlistId,
        trackId: parseInt(trackId)
      }
    });

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("Error adding track to playlist:", error);
    return res.status(500).json({ error: "Failed to add track to playlist" });
  }
});

router.delete("/playlists/:id/tracks/:trackId", jwtMiddleware, adminMiddleware, async (req, res) => {
  try {
    const playlistId = parseInt(req.params.id);
    const trackId = parseInt(req.params.trackId);

    if (isNaN(playlistId) || isNaN(trackId)) {
      return res.status(400).json({ error: "Invalid playlist ID or track ID" });
    }

    await prisma.musicQuizPlaylistTrack.deleteMany({
      where: {
        playlistId,
        trackId
      }
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error removing track from playlist:", error);
    return res.status(500).json({ error: "Failed to remove track from playlist" });
  }
});

export default router;