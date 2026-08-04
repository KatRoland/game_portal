"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useUser } from "./UserContext";
import {
  connectChatWS,
  disconnectChatWS,
  getChatWSClient,
  WSChatMessage,
} from "@/lib/chatWs";
import { SiteChatMessage, ChatUser } from "@/types";

interface ChatContextValue {
  messages: SiteChatMessage[];
  onlineCount: number;
  onlineUsers: ChatUser[];
  unreadCount: number;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  sendMessage: (content: string) => void;
  deleteMessage: (id: number) => void;
  clearChat: () => void;
  isConnected: boolean;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUser();
  const [messages, setMessages] = useState<SiteChatMessage[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpenState] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const setIsOpen = (val: boolean) => {
    setIsOpenState(val);
    if (val) {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    if (!user) {
      disconnectChatWS();
      setMessages([]);
      setOnlineCount(0);
      setOnlineUsers([]);
      setIsConnected(false);
      return;
    }

    const client = connectChatWS();

    const onStatus = (s: string) => {
      setIsConnected(s === "connected");
    };
    client.onStatus(onStatus);
    setIsConnected(client.getStatus() === "connected");

    const onHistory = (payload: { messages: SiteChatMessage[] }) => {
      if (payload?.messages) {
        setMessages(payload.messages);
      }
    };

    const onMessage = (payload: SiteChatMessage) => {
      if (!payload) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.id)) return prev;
        return [...prev, payload];
      });
      if (!isOpenRef.current) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    const onDeleted = (payload: { id: number }) => {
      if (payload?.id) {
        setMessages((prev) => prev.filter((m) => m.id !== payload.id));
      }
    };

    const onCleared = () => {
      setMessages([]);
    };

    const onOnlineUsers = (payload: { count: number; users: ChatUser[] }) => {
      if (typeof payload?.count === "number") {
        setOnlineCount(payload.count);
      }
      if (Array.isArray(payload?.users)) {
        setOnlineUsers(payload.users);
      }
    };

    client.on("chat:history", onHistory);
    client.on("chat:message", onMessage);
    client.on("chat:deleted", onDeleted);
    client.on("chat:cleared", onCleared);
    client.on("chat:online_users", onOnlineUsers);

    return () => {
      client.off("chat:history", onHistory);
      client.off("chat:message", onMessage);
      client.off("chat:deleted", onDeleted);
      client.off("chat:cleared", onCleared);
      client.off("chat:online_users", onOnlineUsers);
      client.offStatus(onStatus);
    };
  }, [user]);

  const sendMessage = (content: string) => {
    if (!content.trim()) return;
    const client = getChatWSClient();
    client.send({
      type: "chat:send",
      payload: { content },
    });
  };

  const deleteMessage = (id: number) => {
    const client = getChatWSClient();
    client.send({
      type: "chat:delete",
      payload: { id },
    });
  };

  const clearChat = () => {
    const client = getChatWSClient();
    client.send({
      type: "chat:clear",
    });
  };

  return (
    <ChatContext.Provider
      value={{
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
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
