import { Router, Request, Response } from "express";
import { jwtMiddleware } from "../middleware/jwt";
import { adminMiddleware } from "../middleware/admin";
import multer from "multer";
import path from "path";
import fs from "fs";
import prisma from "../db/prisma";
import { MusicQuizTrack, MusicQuizPlaylist, MusicQuizPlaylistTrack } from "@prisma/client";
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

// Set ffmpeg path from the static package
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

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

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];
  const allowedExtensions = ['.mp3', '.wav', '.ogg', '.mpeg'];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed (invalid type or extension)'));
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
        // Clean up uploaded files if playlist not found
        files.forEach(f => fs.unlinkSync(f.path));
        return res.status(404).json({ error: "Playlist not found" });
      }
    }

    // Validate files content with ffmpeg (decoding check)
    const validFiles: Express.Multer.File[] = [];
    for (const file of files) {
      try {
        await new Promise((resolve, reject) => {
          // Attempt to decode a bit of the file to verify it's valid audio
          ffmpeg(file.path)
            .format('null')
            .duration(1) // Check first second to be fast
            .on('end', resolve)
            .on('error', reject)
            .save(process.platform === 'win32' ? 'NUL' : '/dev/null');
        });
        validFiles.push(file);
      } catch (err) {
        console.error(`Invalid media file ${file.originalname}:`, err);
        // Delete invalid file
        fs.unlinkSync(file.path);
      }
    }

    if (validFiles.length === 0) {
      return res.status(400).json({ error: "All uploaded files failed validation (not valid and playable audio files)" });
    }

    const dbFiles = await Promise.all(
      validFiles.map(async (file) => {
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
      message: `Successfully uploaded ${validFiles.length} file(s) (processed ${files.length})`,
      tracks: dbFiles
    });
  } catch (error) {
    console.error("Error uploading files:", error);
    // Try to cleanup files
    const files = req.files as Express.Multer.File[];
    if (files) {
      files.forEach(f => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path)
      });
    }
    return res.status(500).json({ error: "Failed to upload files" });
  }
});



export default router;
