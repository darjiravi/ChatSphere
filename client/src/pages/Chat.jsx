import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import ChatWindow from "../components/ChatWindow.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";

const Chat = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [selectedUser, setSelectedUser] = useState(null);
  const [unreadMap, setUnreadMap] = useState({});

  // Track unread counts for conversations that aren't currently open
  useEffect(() => {
    if (!socket) return;

    const onNew = (msg) => {
      const senderId = msg.sender?._id || msg.sender;
      const receiverId = msg.receiver?._id || msg.receiver;
      if (receiverId !== user._id) return; // not a message to me
      if (selectedUser && senderId === selectedUser._id) return; // already viewing

      setUnreadMap((prev) => ({ ...prev, [senderId]: (prev[senderId] || 0) + 1 }));
    };

    socket.on("message:new", onNew);
    return () => socket.off("message:new", onNew);
  }, [socket, selectedUser, user]);

  const handleSelectUser = (u) => {
    setSelectedUser(u);
    setUnreadMap((prev) => ({ ...prev, [u._id]: 0 }));
  };

  return (
    <div className="h-screen w-screen flex bg-offwhite overflow-hidden">
      <Sidebar selectedUser={selectedUser} onSelectUser={handleSelectUser} unreadMap={unreadMap} />
      <ChatWindow selectedUser={selectedUser} />
    </div>
  );
};

export default Chat;
