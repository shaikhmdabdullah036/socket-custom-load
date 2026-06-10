export interface TickerData {
  symbol: string;
  last_price: number;
  mark_price: number;
  change_24h: number; // computed: (ltp_change_24h - 1) * 100
  volume_24h: number;
  high_24h: number;
  low_24h: number;
  funding_rate: number;
}

export interface OrderbookLevel {
  price: number;
  quantity: number;
  total: number; // cumulative
}

export interface OrderbookData {
  symbol: string;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
}

export interface Trade {
  id: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: number; // ms
  timeLabel: string;
}

export interface Product {
  symbol: string;
  name: string;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';
