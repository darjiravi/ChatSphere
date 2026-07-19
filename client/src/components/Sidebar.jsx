import { useEffect, useMemo, useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";

const initials = (name) => name?.slice(0, 2).toUpperCase();

const Sidebar = ({ selectedUser, onSelectUser, unreadMap }) => {
  const { user, logout } = useAuth();
  const { onlineUserIds } = useSocket();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await api.get("/users");
        setUsers(data.users);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    return users.filter((u) => u.username.toLowerCase().includes(search.trim().toLowerCase()));
  }, [users, search]);

  return (
    <div className="w-full sm:w-80 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-semibold">
              C
            </div>
            <span className="font-semibold text-gray-900 text-lg">ChatSphere</span>
          </div>
        </div>
        <input
          type="text"
          placeholder="Search people..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto">
        {loading && <div className="p-4 text-sm text-gray-400">Loading contacts...</div>}
        {!loading && filteredUsers.length === 0 && (
          <div className="p-4 text-sm text-gray-400">No users found.</div>
        )}
        {filteredUsers.map((u) => {
          const isOnline = onlineUserIds.has(u._id);
          const isActive = selectedUser?._id === u._id;
          const unread = unreadMap?.[u._id] || 0;
          return (
            <button
              key={u._id}
              onClick={() => onSelectUser(u)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-2 ${
                isActive
                  ? "bg-brand-50 border-brand-600"
                  : "border-transparent hover:bg-gray-50"
              }`}
            >
              <div className="relative flex-shrink-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm"
                  style={{ backgroundColor: u.avatarColor }}
                >
                  {initials(u.username)}
                </div>
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900 text-sm truncate">{u.username}</p>
                </div>
                <p className="text-xs text-gray-400">{isOnline ? "Online" : "Offline"}</p>
              </div>
              {unread > 0 && (
                <span className="bg-brand-600 text-white text-[11px] font-semibold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Current user footer */}
      <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
          style={{ backgroundColor: user?.avatarColor }}
        >
          {initials(user?.username || "")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{user?.username}</p>
          <p className="text-xs text-gray-400">You</p>
        </div>
        <button
          onClick={logout}
          className="text-xs text-gray-500 hover:text-red-600 font-medium transition-colors"
        >
          Log out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
