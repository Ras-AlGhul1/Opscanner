/**
 * Binance API wrapper — Triangular Arbitrage
 * Uses user's own API keys. ArbitraxAI never holds funds.
 */
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const crypto = require('crypto');

const BASE = 'https://api.binance.com';

class BinanceClient {
  constructor(apiKey, apiSecret) {
    this.apiKey    = apiKey;
    this.apiSecret = apiSecret;
  }

  // ── Signed request ──────────────────────────────────────────
  sign(params) {
    const query = new URLSearchParams({ ...params, timestamp: Date.now() }).toString();
    const sig   = crypto.createHmac('sha256', this.apiSecret).update(query).digest('hex');
    return `${query}&signature=${sig}`;
  }

  async request(method, path, params = {}, signed = false) {
    const query  = signed ? this.sign(params) : new URLSearchParams(params).toString();
    const url    = `${BASE}${path}${method === 'GET' && query ? '?' + query : ''}`;
    const opts   = {
      method,
      headers: { 'X-MBX-APIKEY': this.apiKey, 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(8000),
    };
    if (method === 'POST' && query) opts.body = query;
    const res  = await fetch(url, opts);
    const data = await res.json();
    if (data.code && data.code < 0) throw new Error(`Binance error ${data.code}: ${data.msg}`);
    return data;
  }

  // ── Market data (no auth needed) ───────────────────────────
  async getPrices() {
    return this.request('GET', '/api/v3/ticker/price');
  }

  async getExchangeInfo() {
    return this.request('GET', '/api/v3/exchangeInfo');
  }

  async getAccountInfo() {
    return this.request('GET', '/api/v3/account', {}, true);
  }

  async getBalance(asset) {
    const account = await this.getAccountInfo();
    const bal     = account.balances?.find(b => b.asset === asset);
    return parseFloat(bal?.free ?? '0');
  }

  // ── Order execution ─────────────────────────────────────────
  async marketOrder(symbol, side, quoteOrderQty) {
    return this.request('POST', '/api/v3/order', {
      symbol,
      side,                    // BUY or SELL
      type: 'MARKET',
      quoteOrderQty: quoteOrderQty.toFixed(2),
    }, true);
  }

  // ── Triangular arbitrage scanner ────────────────────────────
  // Finds A→B→C→A loops where the combined rate exceeds 1 + fees
  async findTriangularOpportunities(baseAsset = 'USDT', minProfitPct = 0.15) {
    const [pricesRaw, info] = await Promise.all([this.getPrices(), this.getExchangeInfo()]);

    // Build price map
    const prices = {};
    for (const p of pricesRaw) prices[p.symbol] = parseFloat(p.price);

    // Build symbol set for quick lookup
    const symbols    = new Set(info.symbols?.map(s => s.symbol) ?? []);
    const makerFee   = 0.001; // 0.1% per leg
    const totalFees  = Math.pow(1 - makerFee, 3);

    // Common intermediate assets
    const intermediates = ['BTC', 'ETH', 'BNB', 'BUSD'];
    const opportunities = [];

    for (const mid of intermediates) {
      // Get all coins tradeable against mid
      const coins = info.symbols
        ?.filter(s => s.quoteAsset === mid && s.status === 'TRADING')
        .map(s => s.baseAsset) ?? [];

      for (const coin of coins.slice(0, 30)) {
        // Path: USDT → mid → coin → USDT
        const leg1 = `${mid}${baseAsset}`;  // buy mid with USDT
        const leg2 = `${coin}${mid}`;       // buy coin with mid
        const leg3 = `${coin}${baseAsset}`; // sell coin for USDT

        if (!symbols.has(leg1) || !symbols.has(leg2) || !symbols.has(leg3)) continue;

        const p1 = prices[leg1]; // mid price in USDT
        const p2 = prices[leg2]; // coin price in mid
        const p3 = prices[leg3]; // coin price in USDT

        if (!p1 || !p2 || !p3) continue;

        // If we start with 1 USDT:
        // 1. Buy mid:  1 / p1 mid units
        // 2. Buy coin: (1/p1) / p2 coin units
        // 3. Sell for USDT: ((1/p1)/p2) * p3 USDT
        const endValue  = (1 / p1 / p2) * p3;
        const profitPct = (endValue * totalFees - 1) * 100;

        if (profitPct >= minProfitPct) {
          opportunities.push({
            type:      'triangular',
            exchange:  'Binance',
            path:      `USDT → ${mid} → ${coin} → USDT`,
            legs:      [leg1, leg2, leg3],
            profitPct: parseFloat(profitPct.toFixed(4)),
            endValue:  parseFloat((endValue * totalFees).toFixed(6)),
            prices:    { [leg1]: p1, [leg2]: p2, [leg3]: p3 },
          });
        }
      }
    }

    // Sort by profit descending
    opportunities.sort((a, b) => b.profitPct - a.profitPct);
    return opportunities.slice(0, 5);
  }

  // ── Execute a triangular arb ────────────────────────────────
  async executeTriangular(path, legs, stakeUSDT) {
    const [leg1, leg2, leg3] = legs;
    const results = [];

    // Leg 1: Buy mid asset with USDT
    const r1 = await this.marketOrder(leg1, 'BUY', stakeUSDT);
    results.push(r1);
    const midQty = parseFloat(r1.executedQty);

    // Leg 2: Buy coin with mid asset
    const r2 = await this.marketOrder(leg2, 'BUY', midQty);
    results.push(r2);
    const coinQty = parseFloat(r2.executedQty);

    // Leg 3: Sell coin for USDT
    const r3 = await this.marketOrder(leg3, 'SELL', coinQty);
    results.push(r3);
    const endUSDT = parseFloat(r3.cummulativeQuoteQty);

    return { path, stakeUSDT, endUSDT, profitUSDT: endUSDT - stakeUSDT, legs: results };
  }

  // ── Validate API keys ───────────────────────────────────────
  async validateKeys() {
    try {
      await this.getAccountInfo();
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }
}

module.exports = BinanceClient;
