import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const AVATAR_COLORS = [
  "#2563eb", "#1d4ed8", "#0ea5e9", "#0284c7",
  "#4f46e5", "#6366f1", "#0891b2", "#3b82f6",
];

const publicUser = (user) => ({
  _id: user._id,
  username: user.username,
  avatarColor: user.avatarColor,
  isOnline: user.isOnline,
  lastSeen: user.lastSeen,
});

// REGISTER
router.post("/register", async (req, res) => {
  try {
    let { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    username = username.trim().toLowerCase();

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: "Username must be 3-20 characters." });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ message: "Username can only contain letters, numbers, and underscores." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ message: "That username is already taken." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const user = await User.create({ username, password: hashedPassword, avatarColor });

    req.session.userId = user._id.toString();

    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during registration." });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    let { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }
    username = username.trim().toLowerCase();

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    req.session.userId = user._id.toString();
    user.isOnline = true;
    await user.save();

    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during login." });
  }
});

// LOGOUT
router.post("/logout", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out." });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully." });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during logout." });
  }
});

// CURRENT USER
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;
