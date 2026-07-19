import express from "express";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const publicUser = (user) => ({
  _id: user._id,
  username: user.username,
  avatarColor: user.avatarColor,
  isOnline: user.isOnline,
  lastSeen: user.lastSeen,
});

// GET all users except self (contact list)
router.get("/", requireAuth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.session.userId } }).sort({ username: 1 });
    res.json({ users: users.map(publicUser) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching users." });
  }
});

// SEARCH users by username
router.get("/search", requireAuth, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ users: [] });

    const users = await User.find({
      _id: { $ne: req.session.userId },
      username: { $regex: q, $options: "i" },
    }).limit(20);

    res.json({ users: users.map(publicUser) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error searching users." });
  }
});

export default router;
