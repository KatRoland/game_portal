import { Router } from "express";
import { jwtMiddleware } from "../middleware/jwt";
import { adminMiddleware } from "../middleware/admin";
import multer from "multer";
import path from "path";
import fs from "fs";
import prisma from "../db/prisma";
import { MusicQuizTrack, MusicQuizPlaylist } from "@prisma/client";

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads/music_quiz");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 10MB
    files: 100 // Maximum 100 fálj
  }
});

router.get("/musicquiz/files", jwtMiddleware, async (req, res) => {

  const referer = req.headers.referer;
  if (!referer || !referer.includes("game.katroland.hu")) {
    res.status(403).json({ error: "forbidden" })
    return
  }

  try {
    const tracks = await prisma.musicQuizTrack.findMany({
      orderBy: { title: 'asc' }
    });

    return res.status(200).json({ tracks });
  } catch (error) {
    console.error("Error fetching music quiz files:", error);
    return res.status(500).json({ error: "Failed to fetch music quiz files" });
  }
});

router.get("/musicquiz/playlists/:id/tracks", jwtMiddleware, async (req, res) => {

  const referer = req.headers.referer;
  if (!referer || !referer.includes("game.katroland.hu")) {
    res.status(403).json({ error: "forbidden" })
    return
  }

  try {
    const playlistId = parseInt(req.params.id);

    if (isNaN(playlistId)) {
      return res.status(400).json({ error: "Invalid playlist ID" });
    }

    // Get all track IDs in this playlist
    const playlistTracks = await prisma.musicQuizPlaylistTrack.findMany({
      where: { playlistId },
      select: { trackId: true }
    });

    const trackIds = playlistTracks.map(pt => pt.trackId);

    // Get all tracks
    const tracks = await prisma.musicQuizTrack.findMany({
      where: {
        id: { in: trackIds }
      },
      orderBy: { title: 'asc' }
    });

    return res.status(200).json({ tracks });
  } catch (error) {
    console.error("Error fetching playlist tracks:", error);
    return res.status(500).json({ error: "Failed to fetch playlist tracks" });
  }
});

router.post("/upload/musicquiz", jwtMiddleware, adminMiddleware, upload.array('music', 100), async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "unauthenticated" });


    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const playlistId = parseInt(req.body.playlistId) || null;
    let playlist: MusicQuizPlaylist | null = null;

    if (playlistId) {
      playlist = await prisma.musicQuizPlaylist.findUnique({
        where: { id: playlistId }
      });

      if (!playlist) {
        return res.status(404).json({ error: "Playlist not found" });
      }
    }

    const dbFiles = await Promise.all(
      files.map(async (file) => {
        const title = path.basename(file.originalname, path.extname(file.originalname));
        const relativePath = `music_quiz/${file.filename}`;

        let track = await prisma.musicQuizTrack.create({
          data: {
            title: title,
            fileUrl: relativePath,
          }
        });

        if (playlist) {
          await prisma.musicQuizPlaylistTrack.create({
            data: {
              playlistId: playlist.id,
              trackId: track.id
            }
          });
        }

        return track;
      })
    );

    return res.status(201).json({
      message: `Successfully uploaded ${files.length} file(s)`,
      tracks: dbFiles
    });
  } catch (error) {
    console.error("Error uploading files:", error);
    return res.status(500).json({ error: "Failed to upload files" });
  }
});



export default router;
