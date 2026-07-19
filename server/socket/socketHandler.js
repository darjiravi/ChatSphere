import Message from "../models/Message.js";
import User from "../models/User.js";

// userId -> Set of socket ids (a user can have multiple tabs open)
const onlineUsers = new Map();

const addOnlineUser = (userId, socketId) => {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
};

const removeOnlineUser = (userId, socketId) => {
  if (!onlineUsers.has(userId)) return;
  onlineUsers.get(userId).delete(socketId);
  if (onlineUsers.get(userId).size === 0) onlineUsers.delete(userId);
};

const isUserOnline = (userId) => onlineUsers.has(userId);

export const initSocket = (io) => {
  io.on("connection", (socket) => {
    const session = socket.request.session;

    if (!session || !session.userId) {
      socket.disconnect(true);
      return;
    }

    const userId = session.userId;

    // Join a private room named after the user's id
    socket.join(userId);
    addOnlineUser(userId, socket.id);

    // Broadcast that this user is now online
    User.findByIdAndUpdate(userId, { isOnline: true }).exec();
    socket.broadcast.emit("user:online", { userId });

    // Send a new chat message
    socket.on("message:send", async ({ receiver, content }, callback) => {
      try {
        if (!receiver || !content || !content.trim()) {
          if (callback) callback({ error: "Message content is required." });
          return;
        }

        const message = await Message.create({
          sender: userId,
          receiver,
          content: content.trim(),
        });

        const populated = await message.populate([
          { path: "sender", select: "username avatarColor" },
          { path: "receiver", select: "username avatarColor" },
        ]);

        // send to receiver's room (all their open tabs) and back to sender's other tabs
        io.to(receiver).to(userId).emit("message:new", populated);

        if (callback) callback({ success: true, message: populated });
      } catch (err) {
        console.error("message:send error", err);
        if (callback) callback({ error: "Could not send message." });
      }
    });

    // Edit an existing message
    socket.on("message:edit", async ({ messageId, content }, callback) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return callback && callback({ error: "Message not found." });
        if (message.sender.toString() !== userId) {
          return callback && callback({ error: "Not authorized." });
        }
        message.content = content.trim();
        message.edited = true;
        await message.save();

        io.to(message.receiver.toString()).to(userId).emit("message:updated", {
          _id: message._id,
          content: message.content,
          edited: true,
        });

        if (callback) callback({ success: true });
      } catch (err) {
        console.error("message:edit error", err);
        if (callback) callback({ error: "Could not edit message." });
      }
    });

    // Delete a message
    socket.on("message:delete", async ({ messageId }, callback) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return callback && callback({ error: "Message not found." });
        if (message.sender.toString() !== userId) {
          return callback && callback({ error: "Not authorized." });
        }
        const receiver = message.receiver.toString();
        await message.deleteOne();

        io.to(receiver).to(userId).emit("message:deleted", { _id: messageId });

        if (callback) callback({ success: true });
      } catch (err) {
        console.error("message:delete error", err);
        if (callback) callback({ error: "Could not delete message." });
      }
    });

    // Typing indicator
    socket.on("typing:start", ({ receiver }) => {
      socket.to(receiver).emit("typing:start", { userId });
    });
    socket.on("typing:stop", ({ receiver }) => {
      socket.to(receiver).emit("typing:stop", { userId });
    });

    // Mark messages as read
    socket.on("message:read", async ({ senderId }) => {
      try {
        await Message.updateMany(
          { sender: senderId, receiver: userId, read: false },
          { $set: { read: true } }
        );
        io.to(senderId).emit("message:read", { by: userId });
      } catch (err) {
        console.error("message:read error", err);
      }
    });

    socket.on("disconnect", async () => {
      removeOnlineUser(userId, socket.id);
      if (!isUserOnline(userId)) {
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
        socket.broadcast.emit("user:offline", { userId, lastSeen: new Date() });
      }
    });
  });
};
