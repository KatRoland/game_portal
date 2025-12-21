import express from "express";
import cors from "cors";
import path from "path";
import authRoutes from "./routes/auth";
import meRoutes from "./routes/me";
import userRoutes from "./routes/user";
import musicquizRoutes from "./routes/musicquiz";
import fileRoutes from "./routes/file";
import imageRoundRoutes from "./routes/imgr"
import sopPlaylistRoutes from "./routes/sopplaylist"
import karaokeRouter from "./routes/karaoke"

const app = express();

// Reverse proxy (pl. NPM) mögött szükséges a 'trust proxy' beállítása, hogy az Express helyesen érzékelje a biztonságos kapcsolatokat és a kliens IP-ket.
app.set('trust proxy', true);

// CORS beállítások
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8081,https://game.katroland.hu,https://gameapi.katroland.hu,https://discord.com')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

console.log(allowedOrigins)

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  // allow typical headers used by the frontend
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

app.use("/uploads", express.static(path.resolve("uploads")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/me", meRoutes);
app.use("/user", userRoutes);
app.use("/musicquiz", musicquizRoutes);
app.use("/", fileRoutes); // need to refactoring

app.use("/karaoke", karaokeRouter)

app.use("/imgr", imageRoundRoutes)
app.use("/sop", sopPlaylistRoutes)

export default app;
