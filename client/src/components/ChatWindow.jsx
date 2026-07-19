import { useEffect, useRef, useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import MessageBubble from "./MessageBubble.jsx";

const initials = (name) => name?.slice(0, 2).toUpperCase();

const ChatWindow = ({ selectedUser }) => {
  const { user } = useAuth();
  const { socket, onlineUserIds } = useSocket();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Fetch conversation history when selected user changes
  useEffect(() => {
    if (!selectedUser) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/messages/${selectedUser._id}`);
        if (!cancelled) setMessages(data.messages);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();

    if (socket) {
      socket.emit("message:read", { senderId: selectedUser._id });
    }

    return () => {
      cancelled = true;
    };
  }, [selectedUser, socket]);

  // Socket listeners scoped to the active conversation
  useEffect(() => {
    if (!socket || !selectedUser) return;

    const belongsToConversation = (msg) => {
      const senderId = msg.sender?._id || msg.sender;
      const receiverId = msg.receiver?._id || msg.receiver;
      return (
        (senderId === selectedUser._id && receiverId === user._id) ||
        (senderId === user._id && receiverId === selectedUser._id)
      );
    };

    const onNew = (msg) => {
      if (!belongsToConversation(msg)) return;
      setMessages((prev) => [...prev, msg]);
      const senderId = msg.sender?._id || msg.sender;
      if (senderId === selectedUser._id) {
        socket.emit("message:read", { senderId: selectedUser._id });
      }
    };

    const onUpdated = (payload) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === payload._id ? { ...m, content: payload.content, edited: true } : m))
      );
    };

    const onDeleted = (payload) => {
      setMessages((prev) => prev.filter((m) => m._id !== payload._id));
    };

    const onTypingStart = ({ userId }) => {
      if (userId === selectedUser._id) setOtherTyping(true);
    };
    const onTypingStop = ({ userId }) => {
      if (userId === selectedUser._id) setOtherTyping(false);
    };

    socket.on("message:new", onNew);
    socket.on("message:updated", onUpdated);
    socket.on("message:deleted", onDeleted);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);

    return () => {
      socket.off("message:new", onNew);
      socket.off("message:updated", onUpdated);
      socket.off("message:deleted", onDeleted);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
    };
  }, [socket, selectedUser, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  const handleSend = (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || !socket || !selectedUser) return;

    socket.emit("message:send", { receiver: selectedUser._id, content }, (res) => {
      if (res?.error) {
        console.error(res.error);
      }
    });
    setText("");
    socket.emit("typing:stop", { receiver: selectedUser._id });
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    if (!socket || !selectedUser) return;

    socket.emit("typing:start", { receiver: selectedUser._id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing:stop", { receiver: selectedUser._id });
    }, 1500);
  };

  const handleEdit = (messageId, content) => {
    socket.emit("message:edit", { messageId, content }, (res) => {
      if (res?.error) console.error(res.error);
      else {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, content, edited: true } : m))
        );
      }
    });
  };

  const handleDelete = (messageId) => {
    socket.emit("message:delete", { messageId }, (res) => {
      if (res?.error) console.error(res.error);
      else setMessages((prev) => prev.filter((m) => m._id !== messageId));
    });
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-offwhite">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center text-2xl font-semibold mx-auto mb-4">
            💬
          </div>
          <p className="text-gray-500 font-medium">Select a conversation to start chatting</p>
        </div>
      </div>
    );
  }

  const isOnline = onlineUserIds.has(selectedUser._id);

  return (
    <div className="flex-1 flex flex-col h-full bg-offwhite min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-white">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm"
          style={{ backgroundColor: selectedUser.avatarColor }}
        >
          {initials(selectedUser.username)}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{selectedUser.username}</p>
          <p className="text-xs text-gray-400">
            {otherTyping ? (
              <span className="text-brand-600 font-medium">typing...</span>
            ) : isOnline ? (
              "Online"
            ) : (
              "Offline"
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {loading && <div className="text-center text-sm text-gray-400 mt-4">Loading messages...</div>}
        {!loading && messages.length === 0 && (
          <div className="text-center text-sm text-gray-400 mt-4">
            No messages yet. Say hello to {selectedUser.username}!
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            isOwn={(msg.sender?._id || msg.sender) === user._id}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-white">
        <input
          type="text"
          value={text}
          onChange={handleTyping}
          placeholder="Type a message..."
          className="flex-1 rounded-full bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="w-10 h-10 flex-shrink-0 rounded-full bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors"
          title="Send"
        >
          ➤
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
