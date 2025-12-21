export type WSMessage = {
  type: string;
  payload?: any;
}

export class WSClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private messageHandlers: Map<string, ((payload: any) => void)[]> = new Map();
  private statusHandlers: ((s: string) => void)[] = [];
  private status: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatIntervalMs = 15000;
  private lastActivityAt: number = Date.now();

  constructor(private accessToken: string, private page: string) { }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.setStatus('connecting');

    let base = process.env.NEXT_PUBLIC_WS_BASE_URL || process.env.WS_BASE_URL || 'ws://localhost:4000/ws';

    if (typeof window !== 'undefined') {
      if (window.location.protocol === 'https:') {
        if (base.startsWith('ws://')) base = base.replace(/^ws:\/\//i, 'wss://');
        if (base.startsWith('/')) base = `wss://${window.location.host}${base}`;
      } else {
        if (base.startsWith('/')) base = `ws://${window.location.host}${base}`;
      }
    }

    console.log(`Connecting to WebSocket at ${base} for page ${this.page}`);
    const wsUrl = new URL(`${base}/${this.page}`);
    wsUrl.searchParams.set('token', this.accessToken);

    this.ws = new WebSocket(wsUrl.toString());

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      this.startHeartbeat();
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.setStatus('disconnected');
      this.send({ type: 'close' });
      this.stopHeartbeat();
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      try {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          this.setStatus('disconnected');
        }
      } catch (e) { console.error(e) }
    };

    this.ws.onmessage = (event) => {
      this.lastActivityAt = Date.now();
      try {
        const message: WSMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const maxDelay = 30000;
    const base = 100;
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

  private setStatus(s: 'connecting' | 'connected' | 'disconnected') {
    this.status = s;
    this.statusHandlers.forEach((h) => {
      try { h(s); } catch (e) { console.error('status handler', e); }
    });
  }

  send(message: WSMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(message));
    return true;
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

  private handleMessage(message: WSMessage) {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message.payload));
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.lastActivityAt = Date.now();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.send({ type: 'ping', payload: { ts: Date.now() } });
        } catch (e) { console.error(e) }
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
  }
}

let wsClient: WSClient | null = null;
const pendingStatusSubscribers: ((s: string) => void)[] = [];

export function subscribeToWSStatus(cb: (s: string) => void) {
  if (wsClient) {
    wsClient.onStatus(cb);
  } else {
    pendingStatusSubscribers.push(cb);
  }
}

export function unsubscribeToWSStatus(cb: (s: string) => void) {
  if (wsClient) {
    wsClient.offStatus(cb);
  } else {
    const idx = pendingStatusSubscribers.indexOf(cb);
    if (idx !== -1) pendingStatusSubscribers.splice(idx, 1);
  }
}

export function getWSStatus() {
  return wsClient ? wsClient.getStatus() : 'disconnected';
}

export function createWS(accessToken: string, page: string) {
  if (wsClient) {
    wsClient.disconnect();
  }
  wsClient = new WSClient(accessToken, page);
  pendingStatusSubscribers.forEach((cb) => wsClient && wsClient.onStatus(cb));
  pendingStatusSubscribers.length = 0;
  wsClient.connect();
  return wsClient;
}

export function getWSClient() {
  return wsClient;
}
