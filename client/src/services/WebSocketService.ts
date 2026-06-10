import { parseSubscriptionKey, subscriptionKey } from '../utils/subscriptionKey';

type MessageHandler = (data: unknown) => void;
type StatusListener = (status: string) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private readonly url: string;
  // key = "channel:symbol" → set of handlers
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private statusListeners: Set<StatusListener> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private readonly maxReconnectDelay = 30000;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.ws = new WebSocket(this.url);
    this.notifyStatus('reconnecting');

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.notifyStatus('connected');
      // Re-subscribe all active channels after reconnect
      this.resubscribeAll();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as Record<string, unknown>;
        // Skip ack messages
        if (msg.type === 'subscriptions') return;

        const channel = msg.type as string;
        const symbol = msg.symbol as string;
        if (!channel || !symbol) return;

        const key = subscriptionKey(channel, symbol);
        const handlers = this.handlers.get(key);
        handlers?.forEach((h) => h(msg));
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.notifyStatus('disconnected');
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  subscribe(channel: string, symbol: string, handler: MessageHandler) {
    const key = subscriptionKey(channel, symbol);
    const isNew = !this.handlers.has(key) || this.handlers.get(key)!.size === 0;

    if (!this.handlers.has(key)) {
      this.handlers.set(key, new Set());
    }
    this.handlers.get(key)!.add(handler);

    if (isNew) {
      this.sendSubscribe([{ name: channel, symbols: [symbol] }]);
    }
  }

  unsubscribe(channel: string, symbol: string, handler: MessageHandler) {
    const key = subscriptionKey(channel, symbol);
    const set = this.handlers.get(key);
    if (!set) return;

    set.delete(handler);
    if (set.size === 0) {
      this.handlers.delete(key);
      this.sendUnsubscribe([{ name: channel, symbols: [symbol] }]);
    }
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private sendSubscribe(channels: { name: string; symbols: string[] }[]) {
    this.send({ type: 'subscribe', payload: { channels } });
  }

  private sendUnsubscribe(channels: { name: string; symbols?: string[] }[]) {
    this.send({ type: 'unsubscribe', payload: { channels } });
  }

  private resubscribeAll() {
    // Group active subscriptions by channel
    const byChannel = new Map<string, string[]>();
    for (const key of this.handlers.keys()) {
      const { channel, symbol } = parseSubscriptionKey(key);
      if (!byChannel.has(channel)) byChannel.set(channel, []);
      byChannel.get(channel)!.push(symbol);
    }
    if (byChannel.size === 0) return;
    const channels = Array.from(byChannel.entries()).map(([name, symbols]) => ({ name, symbols }));
    this.sendSubscribe(channels);
  }

  private send(msg: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private notifyStatus(status: string) {
    this.statusListeners.forEach((l) => l(status));
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }
}

export const wsService = new WebSocketService('ws://localhost:8080');
wsService.connect();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    wsService.disconnect();
  });
}
