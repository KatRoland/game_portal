import http from "http";
import app from "./app";
import { createWebSocketServer } from "./ws/server";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 8081;

const server = http.createServer(app);

createWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
