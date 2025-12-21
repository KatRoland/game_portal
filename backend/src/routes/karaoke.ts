import { Router } from "express";
import { jwtMiddleware } from "../middleware/jwt";
import { adminMiddleware } from "../middleware/admin";
import prisma from "../db/prisma";
import multer from "multer";
import path from "path";
import fs from "fs";
import { KaraokeSong, KaraokeSongLyrics } from "../types/gamemode/KARAOKE";

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads/karaoke");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Egyedi fájlnév generálás
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// fálj filter
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed'));
  }
};

// multer beállítások
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 10MB max
    files: 100 // Maximum 100 fálj
  }
});

// GET /playlists - visszaadja az összes playlist-et
router.get("/playlists", jwtMiddleware, async (req, res) => {

  const referer = req.headers.referer;
  if (!referer || !referer.includes("game.katroland.hu")) {
    res.status(403).json({ error: "forbidden" })
    return
  }

  try {
    const playlists = await prisma.karaokePlaylist.findMany({
      orderBy: { name: "asc" },
      include: {
        Songs: {
          include: {
            Segments: {
              include: {
                Rows: true
              }
            }
          }
        }
      }
    });

    return res.status(200).json({ playlists });
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return res.status(500).json({ error: "Failed to fetch playlists" });
  }
});

// GET /karaoke/tracks/:songid/:segmentid - visszaadja a kiválasztott szegmenshez tartozó zene file-t
router.get("/tracks/:songid/:segmentid", jwtMiddleware, async (req, res) => {
  try {
    const trackId = req.params.songid;
    const segmentId = req.params.segmentid;

    // referer ellenőrzés, ha nem a frontend-tól jön akkor 403
    // const referer = req.headers.referer;
    // if(!referer || !referer.includes("gameportal.domain.tld")) {
    //   res.status(403).json({error: "forbidden"})
    //   return
    // }

    if (!trackId) {
      res.status(404).json({ error: "no id provided!" })
      return
    }

    const track = await prisma.karaokeSongSegment.findFirst({
      where: {
        AND: {
          songId: Number(trackId),
          index: Number(segmentId)
        }
      }
    })

    if (!track) {
      res.status(404).json({ error: "not found" })
      return
    }

    const filePath = path.join(__dirname, "../../uploads/karaoke", track.fileUrl);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.sendFile(filePath);

  } catch (error) {
    console.error("Error fetching track:", error);
    return res.status(500).json({ error: "Failed to fetch track" });
  }
})


router.get("/output/:songid", jwtMiddleware, async (req, res) => {
  try {
    const trackId = req.params.songid;
    // referer ellenőrzés, ha nem a frontend-tól jön akkor 403
    // const referer = req.headers.referer;
    // if(!referer || !referer.includes("gameportal.domain.tld")) {
    //   res.status(403).json({error: "forbidden"})
    //   return
    // }

    if (!trackId) {
      res.status(404).json({ error: "no id provided!" })
      return
    }

    const filePath = path.join(__dirname, "../../uploads/karaoke/output/", trackId);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.sendFile(filePath);

  } catch (error) {
    console.error("Error fetching track:", error);
    return res.status(500).json({ error: "Failed to fetch track" });
  }
})

// POST /karaoke/playlists - lista létrehozása (csak admin)
router.post("/playlists", jwtMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Name is required" });
    }

    // név ellenőrzés, ha már létezik akkor 409
    const existingPlaylist = await prisma.musicQuizPlaylist.findUnique({
      where: { name }
    });

    if (existingPlaylist) {
      return res.status(409).json({ error: "Playlist with this name already exists" });
    }

    const playlist = await prisma.karaokePlaylist.create({
      data: { name }
    });

    return res.status(201).json({ playlist });
  } catch (error) {
    console.error("Error creating playlist:", error);
    return res.status(500).json({ error: "Failed to create playlist" });
  }
});

// DELETE /karaoke/playlists/:id - lista törlése (csak admin)
router.delete("/playlists/:id", jwtMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid playlist ID" });
    }

    // Check if playlist exists
    const playlist = await prisma.karaokePlaylist.findUnique({
      where: { id },
      include: {
        Songs: {
          include: {
            Segments: true
          }
        }
      }
    });

    playlist?.Songs.forEach(song => {
      song?.Segments.forEach(s => {
        const filePath = path.join(__dirname, "../../uploads/karaoke", s.fileUrl);
        fs.unlinkSync(filePath)
      })
    })

    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    // Ellenőrizzük, hogy van-e GameModePlaylist-referencia
    const gameModePlaylist = await prisma.gameModePlaylist.findFirst({
      where: { playlistId: id }
    });

    // Ha van, akkor töröljük
    if (gameModePlaylist) {
      await prisma.gameModePlaylist.delete({
        where: { id: gameModePlaylist.id },
      });
    }

    await prisma.karaokePlaylist.delete({
      where: { id }
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting playlist:", error);
    return res.status(500).json({ error: "Failed to delete playlist" });
  }
});

// DELETE /karaoke/playlists/:id/tracks/:trackId - zene törlése a listából (csak admin)
router.delete("/playlists/:id/tracks/:trackId", jwtMiddleware, adminMiddleware, async (req, res) => {
  try {
    const playlistId = parseInt(req.params.id);
    const trackId = parseInt(req.params.trackId);

    if (isNaN(playlistId) || isNaN(trackId)) {
      return res.status(400).json({ error: "Invalid playlist ID or track ID" });
    }

    const song = await prisma.karaokeSong.findFirst({
      where: {
        id: trackId
      },
      include: {
        Segments: true
      }
    })

    song?.Segments.forEach(s => {
      const filePath = path.join(__dirname, "../../uploads/karaoke", s.fileUrl);
      fs.unlinkSync(filePath)
    })

    await prisma.karaokeSong.delete({
      where: {
        id: trackId
      }
    })

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error removing track from playlist:", error);
    return res.status(500).json({ error: "Failed to remove track from playlist" });
  }
});

router.post("/upload", jwtMiddleware, upload.array('segment', 100), async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "unauthenticated" });

    const playlistId = req.body.playlistId;
    if (!playlistId) return res.status(403).json({ error: "no playlist id" });

    const songName = req.body.songName;
    if (!songName) return res.status(403).json({ error: "no song name" });

    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const song = await prisma.karaokeSong.create({
      data: {
        title: songName,
        playlistId: Number(playlistId)
      }
    })

    for (let i = 0; i < files.length; i++) {
      const file = files[i];


      const segmentList = JSON.parse(req.body.segmentData) as any[];
      const lyricsList = JSON.parse(req.body.lyricsData);
      console.log(lyricsList)
      const segmentData = segmentList.find(f => f.id === i);
      const lyricsData = (lyricsList).segments.find((l: any) => l.index === segmentData.position);


      const segment = await prisma.karaokeSongSegment.create({
        data: {
          index: Number(lyricsData.index),
          fileUrl: file.filename,
          songId: Number(song.id)
        }
      })

      await Promise.all(
        lyricsData.rows.map(async (lyrics: KaraokeSongLyrics) => {
          return await prisma.karaokeSongLyrics.create({
            data: {
              index: Number(lyrics.index),
              lyrics: lyrics.lyrics,
              time: Number(lyrics.time),
              segmentId: Number(segment.id),
            },
          });
        })
      );

    }

    return res.status(201).json({
      message: `Successfully uploaded ${files.length} file`,
      tracks: files
    });
  } catch (error) {
    console.error("Error uploading files:", error);
    return res.status(500).json({ error: "Failed to upload files" });
  }
});

router.post("/record", jwtMiddleware, upload.array('music', 1), async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "unauthenticated" });

    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    return res.status(201).json({
      message: `Successfully uploaded ${files.length} file(s)`,
      tracks: files
    });
  } catch (error) {
    console.error("Error uploading files:", error);
    return res.status(500).json({ error: "Failed to upload files" });
  }
});

export default router;