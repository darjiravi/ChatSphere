import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import { initSocket } from "./socket/socketHandler.js";

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

await connectDB();

const app = express();
const server = http.createServer(app);

// Required behind a reverse proxy (Render, Railway, Fly, Heroku, Vercel, etc.)
// Without this, Express thinks every request is plain HTTP (not HTTPS), so
// "secure" cookies are silently dropped and login appears to "not work" in prod.
app.set("trust proxy", 1);

app.use(
  cors({
    origin: "https://chat-sphere-pearl-phi.vercel.app",
    credentials: true,
  }),
);
app.use(express.json());

const isProd = process.env.NODE_ENV === "production";

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "dev_secret_change_me",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    httpOnly: true,
    // In production the frontend and backend are almost always on different
    // domains, so the cookie must be marked SameSite=None + Secure or the
    // browser will refuse to send it back on cross-site requests.
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
});

app.use(sessionMiddleware);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

const io = new Server(server, {
  cors: { origin: CLIENT_URL, credentials: true },
});

// Share express-session with socket.io
io.engine.use(sessionMiddleware);

initSocket(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
