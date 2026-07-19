import express from "express";
import mongoose from "mongoose";
import Message from "../models/Message.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// GET conversation between logged-in user and :userId
router.get("/:userId", requireAuth, async (req, res) => {
  try {
    const me = req.session.userId;
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    const messages = await Message.find({
      $or: [
        { sender: me, receiver: userId },
        { sender: userId, receiver: me },
      ],
    }).sort({ createdAt: 1 });

    // mark messages sent to me as read
    await Message.updateMany(
      { sender: userId, receiver: me, read: false },
      { $set: { read: true } }
    );

    res.json({ messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching messages." });
  }
});

// CREATE a message (REST fallback; primary path is via socket)
router.post("/", requireAuth, async (req, res) => {
  try {
    const { receiver, content } = req.body;
    if (!receiver || !content || !content.trim()) {
      return res.status(400).json({ message: "Receiver and content are required." });
    }
    if (!mongoose.Types.ObjectId.isValid(receiver)) {
      return res.status(400).json({ message: "Invalid receiver id." });
    }

    const message = await Message.create({
      sender: req.session.userId,
      receiver,
      content: content.trim(),
    });

    res.status(201).json({ message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error creating message." });
  }
});

// UPDATE (edit) a message - only the sender can edit
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Content cannot be empty." });
    }

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }
    if (message.sender.toString() !== req.session.userId) {
      return res.status(403).json({ message: "You can only edit your own messages." });
    }

    message.content = content.trim();
    message.edited = true;
    await message.save();

    res.json({ message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error updating message." });
  }
});

// DELETE a message - only the sender can delete
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }
    if (message.sender.toString() !== req.session.userId) {
      return res.status(403).json({ message: "You can only delete your own messages." });
    }

    await message.deleteOne();
    res.json({ message: "Message deleted.", id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error deleting message." });
  }
});

export default router;
