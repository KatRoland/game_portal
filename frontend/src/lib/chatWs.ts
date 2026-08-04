import { getAccessToken, refreshToken } from "./api";

export type WSChatMessage = {
  type: string;
  payload?: any;
};

export class ChatWSClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private messageHandlers: Map<string, ((payload: any) => void)[]> = new Map();
  private statusHandlers: ((s: string) => void)[] = [];
  private status: "connecting" | "connected" | "disconnected" = "disconnected";
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatIntervalMs = 15000;

  private messageQueue: WSChatMessage[] = [];
  private needTokenRefresh = false;

  constructor() {}

  async connect() {
    if (typeof window === "undefined") return;
    if (this.ws?.readyState === WebSocket.OPEN || this.status === "connecting") return;

    this.setStatus("connecting");

    let token = getAccessToken();
    if (!token || this.needTokenRefresh) {
      this.needTokenRefresh = false;
      await refreshToken();
      token = getAccessToken();
    }

    if (!token) {
      console.error("Chat WS connect failed: No access token available");
      this.setStatus("disconnected");
      this.scheduleReconnect();
      return;
    }

    let base =
      process.env.NEXT_PUBLIC_WS_BASE_URL ||
      process.env.WS_BASE_URL ||
      "ws://localhost:4000/ws";

    if (window.location.protocol === "https:") {
      if (base.startsWith("ws://")) base = base.replace(/^ws:\/\//i, "wss://");
      if (base.startsWith("/")) base = `wss://${window.location.host}${base}`;
    } else {
      if (base.startsWith("/")) base = `ws://${window.location.host}${base}`;
    }

    const wsUrl = new URL(`${base}/chat`);
    wsUrl.searchParams.set("token", token);

    try {
      this.ws = new WebSocket(wsUrl.toString());
    } catch (e) {
      console.error("Chat WS creation error:", e);
      this.setStatus("disconnected");
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log("Chat WebSocket connected");
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.reconnectAttempts = 0;
      this.setStatus("connected");

      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift();
        if (msg) this.send(msg);
      }

      this.startHeartbeat();
    };

    this.ws.onclose = (event) => {
      console.log("Chat WebSocket disconnected", event.code, event.reason);
      if (
        event.code === 4001 ||
        event.code === 1008 ||
        (event.reason &&
          (event.reason.includes("token") || event.reason.includes("expired")))
      ) {
        this.needTokenRefresh = true;
      }
      this.setStatus("disconnected");
      this.stopHeartbeat();
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error("Chat WebSocket error:", error);
      try {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          this.setStatus("disconnected");
        }
      } catch (e) {
        console.error(e);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WSChatMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error("Failed to parse Chat WebSocket message:", error);
      }
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const maxDelay = 30000;
    const base = 500;
    const attempt = Math.min(this.reconnectAttempts, 10);
    const delay = Math.min(maxDelay, base * Math.pow(2, attempt));
    const jitter = Math.floor(Math.random() * 500);
    const total = delay + jitter;
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, total);
  }

  getStatus() {
    return this.status;
  }

  onStatus(handler: (s: string) => void) {
    this.statusHandlers.push(handler);
  }

  offStatus(handler: (s: string) => void) {
    const idx = this.statusHandlers.indexOf(handler);
    if (idx !== -1) this.statusHandlers.splice(idx, 1);
  }

  private setStatus(s: "connecting" | "connected" | "disconnected") {
    this.status = s;
    this.statusHandlers.forEach((h) => {
      try {
        h(s);
      } catch (e) {
        console.error("Chat WS status handler error", e);
      }
    });
  }

  send(message: WSChatMessage): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    } else {
      this.messageQueue.push(message);
      return true;
    }
  }

  on(type: string, handler: (payload: any) => void) {
    const handlers = this.messageHandlers.get(type) || [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);
  }

  off(type: string, handler: (payload: any) => void) {
    const handlers = this.messageHandlers.get(type);
    if (!handlers) return;
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
      if (handlers.length === 0) {
        this.messageHandlers.delete(type);
      }
    }
  }

  private handleMessage(message: WSChatMessage) {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => handler(message.payload));
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.send({ type: "ping", payload: { ts: Date.now() } });
        } catch (e) {
          console.error(e);
        }
      } else {
        this.stopHeartbeat();
      }
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus("disconnected");
  }
}

let chatWsClient: ChatWSClient | null = null;

export function getChatWSClient(): ChatWSClient {
  if (!chatWsClient) {
    chatWsClient = new ChatWSClient();
  }
  return chatWsClient;
}

export function connectChatWS(): ChatWSClient {
  const client = getChatWSClient();
  client.connect();
  return client;
}

export function disconnectChatWS() {
  if (chatWsClient) {
    chatWsClient.disconnect();
    chatWsClient = null;
  }
}
