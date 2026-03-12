const { SYMBOLS, randomPrice, formatPrice } = require("../config");

function generateTicker(symbol) {
  const price = randomPrice(symbol);
  const cfg = SYMBOLS[symbol];
  const markOffset = price * 0.0001;
  const markPrice = price + (Math.random() * 2 - 1) * markOffset;
  const open = parseFloat((price * (1 + (Math.random() * 0.02 - 0.01))).toFixed(cfg.precision));
  const high = parseFloat((price * (1 + Math.random() * 0.02)).toFixed(cfg.precision));
  const low = parseFloat((price * (1 - Math.random() * 0.02)).toFixed(cfg.precision));
  const close = price;
  const spotPrice = formatPrice(symbol, price + (Math.random() * 2 - 1) * markOffset * 2);
  const volume = parseFloat((Math.random() * 50000).toFixed(6));
  const turnover = Math.floor(volume * price);
  const oiContracts = Math.floor(Math.random() * 1000000);
  const contractValue = 0.001;
  const oiValue = (oiContracts * contractValue).toFixed(4);
  const oiValueUsd = (oiContracts * contractValue * price).toFixed(4);
  const fundingRate = (Math.random() * 0.01 - 0.005).toFixed(18);
  const bandWidth = price * 0.05;
  const now = Date.now();
  const timestampUs = now * 1000;
  const askSize = Math.floor(Math.random() * 5000).toString();
  const bidSize = Math.floor(Math.random() * 1000).toString();
  const bestAsk = formatPrice(symbol, price + parseFloat((0.5).toFixed(cfg.precision)));
  const bestBid = formatPrice(symbol, price - parseFloat((0.5).toFixed(cfg.precision)));

  return {
    turnover_usd: turnover,
    underlying_asset_symbol: symbol.replace("USD", ""),
    oi_value_usd: oiValueUsd,
    size: Math.floor(volume * 1000),
    timestamp: timestampUs,
    open,
    mark_price: formatPrice(symbol, markPrice),
    symbol,
    oi: oiValue,
    spot_price: spotPrice,
    close,
    funding_rate: fundingRate,
    type: "v2/ticker",
    quotes: {
      ask_iv: null,
      ask_size: askSize,
      best_ask: bestAsk,
      best_bid: bestBid,
      bid_iv: null,
      bid_size: bidSize,
      impact_mid_price: null,
      mark_iv: (Math.random() * -1).toFixed(8),
    },
    contract_type: "perpetual_futures",
    high,
    mark_basis: (Math.random() * -0.001).toFixed(8),
    price_band: {
      lower_limit: formatPrice(symbol, price - bandWidth),
      upper_limit: formatPrice(symbol, price + bandWidth),
    },
    low,
    top_tag: "crypto",
    sort_priority: 1,
    mark_change_24h: (1 + (Math.random() * 0.02 - 0.01)).toFixed(4),
    leverage: 200,
    turnover_symbol: "USD",
    ltp_change_24h: (1 + (Math.random() * 0.02 - 0.01)).toFixed(4),
    description: `${symbol.replace("USD", "")} Perpetual`,
    tags: ["layer_1"],
    volume,
    oi_contracts: oiContracts.toString(),
    turnover,
    tick_size: cfg.precision <= 1 ? "0.500000000000000000" : (1 / Math.pow(10, cfg.precision)).toFixed(18),
    product_id: Math.floor(Math.random() * 100),
    oi_value_symbol: symbol.replace("USD", ""),
    greeks: null,
    oi_change_usd_6h: ((Math.random() * 2000000 - 1000000)).toFixed(4),
    oi_value: oiValue,
    contract_value: contractValue.toFixed(18),
    product_trading_status: "operational",
    time: new Date().toISOString(),
  };
}

module.exports = { generateTicker };
