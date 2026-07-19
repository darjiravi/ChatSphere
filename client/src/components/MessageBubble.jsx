import { useState } from "react";

const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const MessageBubble = ({ message, isOwn, onEdit, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [showActions, setShowActions] = useState(false);

  const saveEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== message.content) {
      onEdit(message._id, trimmed);
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`flex items-end gap-1.5 max-w-[75%] ${isOwn ? "flex-row-reverse" : ""}`}>
        <div
          className={`relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isOwn
              ? "bg-brand-600 text-white rounded-br-md"
              : "bg-white text-gray-800 border border-gray-100 rounded-bl-md"
          }`}
        >
          {isEditing ? (
            <div className="flex flex-col gap-2 min-w-[180px]">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full rounded-lg text-gray-900 p-2 text-sm resize-none focus:outline-none"
                rows={2}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setDraft(message.content);
                  }}
                  className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="text-xs px-2 py-1 rounded bg-white text-brand-700 font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              <div
                className={`flex items-center gap-1 mt-1 text-[10px] ${
                  isOwn ? "text-brand-100" : "text-gray-400"
                }`}
              >
                <span>{formatTime(message.createdAt)}</span>
                {message.edited && <span>· edited</span>}
              </div>
            </>
          )}
        </div>

        {isOwn && !isEditing && showActions && (
          <div className="flex flex-col gap-1 opacity-80">
            <button
              title="Edit"
              onClick={() => setIsEditing(true)}
              className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs flex items-center justify-center"
            >
              ✎
            </button>
            <button
              title="Delete"
              onClick={() => onDelete(message._id)}
              className="w-6 h-6 rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 text-xs flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
