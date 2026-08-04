"use client";

import React, { useState, useRef, useEffect } from "react";
import { useChat } from "@/contexts/ChatContext";
import { useUser } from "@/contexts/UserContext";
import { ChatUser, SiteChatMessage } from "@/types";

export default function ChatWidget() {
  const { user } = useUser();
  const {
    messages,
    onlineCount,
    onlineUsers,
    unreadCount,
    isOpen,
    setIsOpen,
    sendMessage,
    deleteMessage,
    clearChat,
    isConnected,
  } = useChat();

  const [input, setInput] = useState("");
  const [showOnlineList, setShowOnlineList] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages.length]);

  if (!user) return null;

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getAvatarUrl = (u: ChatUser) => {
    const apiBase =
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.BACKEND_URL ||
      "http://localhost:4000";
    if (u.customAvatar && u.customAvatarUrl) {
      return `${apiBase}/uploads/avatars/${u.customAvatarUrl}`;
    }
    if (u.avatar) {
      return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png`;
    }
    return null;
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {/* Minimized Pill Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 px-5 py-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-medium shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20 backdrop-blur-md"
        >
          {/* Status Dot */}
          <div className="relative flex items-center justify-center">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isConnected ? "bg-green-400" : "bg-yellow-400"
              }`}
            />
            {isConnected && (
              <span className="absolute h-2.5 w-2.5 rounded-full bg-green-400 animate-ping opacity-75" />
            )}
          </div>

          {/* Chat Icon & Label */}
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-white/90 group-hover:rotate-6 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <span className="text-sm font-semibold tracking-wide">
              Site Chat
            </span>
          </div>

          {/* Online Users Pill */}
          <div className="hidden sm:flex items-center gap-1.5 pl-2.5 border-l border-white/20 text-xs text-white/80">
            <span>{onlineCount} online</span>
          </div>

          {/* Unread Message Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-xs font-bold bg-rose-500 text-white rounded-full border-2 border-gray-900 shadow-lg animate-bounce">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div className="flex flex-col w-96 sm:w-[420px] h-[540px] max-h-[85vh] rounded-2xl bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
          {/* Header */}
          <div className="relative flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-purple-900/40 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <span
                  className={`block h-3 w-3 rounded-full ${
                    isConnected ? "bg-green-400" : "bg-yellow-400"
                  }`}
                  title={isConnected ? "Connected" : "Connecting..."}
                />
              </div>

              <div>
                <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                  Global Chat
                </h3>
                <button
                  type="button"
                  onClick={() => setShowOnlineList(!showOnlineList)}
                  className="text-xs text-blue-300 hover:text-blue-200 hover:underline flex items-center gap-1 transition-colors"
                >
                  <span>{onlineCount} user{onlineCount === 1 ? "" : "s"} online</span>
                  <svg
                    className={`w-3 h-3 transform transition-transform ${
                      showOnlineList ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Admin Clear Button */}
              {user.isAdmin && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(!showClearConfirm)}
                    title="Clear Chat (Admin)"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>

                  {showClearConfirm && (
                    <div className="absolute right-0 mt-2 w-48 p-2 rounded-lg bg-gray-800 border border-white/10 shadow-xl z-20">
                      <p className="text-xs text-gray-300 mb-2">
                        Clear all chat messages?
                      </p>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowClearConfirm(false)}
                          className="px-2 py-1 text-xs text-gray-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            clearChat();
                            setShowClearConfirm(false);
                          }}
                          className="px-2 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Minimize/Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Minimize"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Expandable Online Users List */}
          {showOnlineList && (
            <div className="px-4 py-2.5 bg-gray-900/90 border-b border-white/10 max-h-36 overflow-y-auto z-10 text-xs">
              <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
                Online Users ({onlineUsers.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {onlineUsers.map((u) => {
                  const avatarSrc = getAvatarUrl(u);
                  return (
                    <div
                      key={u.id}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10"
                    >
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={u.username}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold">
                          {u.username?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <span className="text-gray-200 font-medium truncate max-w-[100px]">
                        {u.username}
                      </span>
                      {u.isAdmin && (
                        <span className="text-[9px] px-1 bg-amber-500/20 text-amber-300 rounded font-semibold">
                          ADM
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 select-none">
                <svg
                  className="w-10 h-10 mb-2 opacity-30"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
                </svg>
                <p className="text-xs">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((m) => {
                const avatarSrc = getAvatarUrl(m.user);
                const isMe = String(m.user.id) === String(user.id);

                return (
                  <div
                    key={m.id}
                    className={`group flex gap-2.5 items-start ${
                      isMe ? "flex-row-reverse" : ""
                    }`}
                  >
                    {/* User Avatar */}
                    <div className="flex-shrink-0 mt-0.5">
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={m.user.username}
                          className="w-8 h-8 rounded-full object-cover border border-white/10"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs text-white font-bold shadow">
                          {m.user.username?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`relative max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed shadow-md ${
                        isMe
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none"
                          : "bg-gray-800/90 text-gray-100 rounded-tl-none border border-white/5"
                      }`}
                    >
                      {/* Sender Name & Time & Admin Badge */}
                      <div
                        className={`flex items-center gap-1.5 mb-0.5 text-xs ${
                          isMe ? "justify-end text-blue-200" : "text-gray-400"
                        }`}
                      >
                        <span className="font-semibold text-white/90">
                          {m.user.username}
                        </span>
                        {m.user.isAdmin && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full shadow-sm">
                            ADMIN
                          </span>
                        )}
                        <span className="text-[10px] opacity-60">
                          {formatTime(m.createdAt)}
                        </span>
                      </div>

                      {/* Content */}
                      <p className="break-words whitespace-pre-wrap">
                        {m.content}
                      </p>

                      {/* Delete button: Only visible on hover if current user is an Admin (per user requirement) */}
                      {user.isAdmin && (
                        <button
                          type="button"
                          onClick={() => deleteMessage(m.id)}
                          title="Delete message (Admin only)"
                          className={`absolute top-1.5 ${
                            isMe ? "-left-6" : "-right-6"
                          } p-1 text-gray-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity`}
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={handleSend}
            className="p-3 bg-gray-900/90 border-t border-white/10 flex items-center gap-2"
          >
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={1000}
                placeholder="Send a message to everyone..."
                rows={1}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-800/80 text-white placeholder-gray-400 text-sm border border-white/10 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none max-h-24 scrollbar-thin scrollbar-thumb-gray-700"
              />
            </div>

            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg transition-all transform active:scale-95 flex-shrink-0"
              title="Send Message (Enter)"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
