/**
 * Bybit API wrapper — Funding Rate Arbitrage
 * Strategy: hold spot long + perpetual short → collect funding rate
 * Users supply their own API keys. ArbitraxAI never holds funds.
 */
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const crypto = require('crypto');

const BASE = 'https://api.bybit.com';

class BybitClient {
  constructor(apiKey, apiSecret) {
    this.apiKey    = apiKey;
    this.apiSecret = apiSecret;
  }

  // ── Signed request ──────────────────────────────────────────
  sign(params) {
    const ts    = Date.now().toString();
    const recv  = '5000';
    const query = new URLSearchParams(params).toString();
    const pre   = `${ts}${this.apiKey}${recv}${query}`;
    const sig   = crypto.createHmac('sha256', this.apiSecret).update(pre).digest('hex');
    return { sig, ts, recv };
  }

  async request(method, path, params = {}, signed = false) {
    const query = new URLSearchParams(params).toString();
    let url     = `${BASE}${path}`;
    const headers = { 'Content-Type': 'application/json' };

    if (signed) {
      const { sig, ts, recv } = this.sign(params);
      headers['X-BAPI-API-KEY']        = this.apiKey;
      headers['X-BAPI-TIMESTAMP']      = ts;
      headers['X-BAPI-RECV-WINDOW']    = recv;
      headers['X-BAPI-SIGN']           = sig;
    }

    const opts = { method, headers, signal: AbortSignal.timeout(8000) };
    if (method === 'GET' && query) url += '?' + query;
    if (method === 'POST') opts.body = JSON.stringify(params);

    const res  = await fetch(url, opts);
    const data = await res.json();
    if (data.retCode !== 0) throw new Error(`Bybit error ${data.retCode}: ${data.retMsg}`);
    return data.result;
  }

  // ── Funding rates ───────────────────────────────────────────
  async getFundingRates(limit = 20) {
    const data = await this.request('GET', '/v5/market/tickers', { category: 'linear', limit });
    return (data.list ?? []).map(t => ({
      symbol:       t.symbol,
      fundingRate:  parseFloat(t.fundingRate ?? 0),
      nextFunding:  t.nextFundingTime,
      price:        parseFloat(t.lastPrice ?? 0),
      volume24h:    parseFloat(t.volume24h ?? 0),
    }));
  }

  // Find coins with highest absolute funding rates (either direction)
  async findFundingOpportunities(minRatePct = 0.05) {
    const tickers = await this.getFundingRates(50);
    return tickers
      .filter(t => Math.abs(t.fundingRate * 100) >= minRatePct && t.volume24h > 1_000_000)
      .map(t => ({
        symbol:        t.symbol,
        fundingRate:   t.fundingRate,
        fundingRatePct: parseFloat((t.fundingRate * 100).toFixed(4)),
        // Annualised: funding paid every 8h = 3x/day = ~1095x/year
        annualisedPct: parseFloat((t.fundingRate * 100 * 1095).toFixed(2)),
        direction:     t.fundingRate > 0 ? 'SHORT_PERP' : 'LONG_PERP',
        // If rate is positive: longs pay shorts → short perp + long spot
        // If rate is negative: shorts pay longs → long perp + short spot
        strategy:      t.fundingRate > 0
          ? 'Long spot + Short perpetual (collect from longs)'
          : 'Short spot + Long perpetual (collect from shorts)',
        nextFunding:   t.nextFunding,
        price:         t.price,
      }))
      .sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate))
      .slice(0, 5);
  }

  // ── Account info ────────────────────────────────────────────
  async getBalance(coin = 'USDT') {
    const data = await this.request('GET', '/v5/account/wallet-balance', { accountType: 'UNIFIED', coin }, true);
    const bal  = data.list?.[0]?.coin?.find(c => c.coin === coin);
    return parseFloat(bal?.availableToWithdraw ?? '0');
  }

  // ── Place spot order ────────────────────────────────────────
  async placeSpotOrder(symbol, side, qty) {
    return this.request('POST', '/v5/order/create', {
      category: 'spot',
      symbol, side,
      orderType: 'Market',
      qty: qty.toString(),
    }, true);
  }

  // ── Place perp order ────────────────────────────────────────
  async placePerpOrder(symbol, side, qty) {
    return this.request('POST', '/v5/order/create', {
      category:   'linear',
      symbol, side,
      orderType:  'Market',
      qty:        qty.toString(),
      reduceOnly: false,
    }, true);
  }

  // ── Open funding rate position ──────────────────────────────
  // Buys spot + opens opposing perp position to collect funding
  async openFundingPosition(symbol, stakeUSDT, direction) {
    const baseSymbol = symbol.replace('USDT', '');
    const spotSym    = `${baseSymbol}USDT`;

    // Get current price from Bybit
    const tickers = await this.request('GET', '/v5/market/tickers', { category: 'linear', symbol });
    const price   = parseFloat(tickers.list?.[0]?.lastPrice ?? 0);
    if (!price) throw new Error('Could not get price for ' + symbol);

    const qty = parseFloat((stakeUSDT / price).toFixed(4));

    if (direction === 'SHORT_PERP') {
      // Long spot, short perp
      const spotOrder = await this.placeSpotOrder(spotSym, 'Buy', qty);
      const perpOrder = await this.placePerpOrder(symbol, 'Sell', qty);
      return { spotOrder, perpOrder, direction, qty, price, stakeUSDT };
    } else {
      // Short spot, long perp
      const spotOrder = await this.placeSpotOrder(spotSym, 'Sell', qty);
      const perpOrder = await this.placePerpOrder(symbol, 'Buy', qty);
      return { spotOrder, perpOrder, direction, qty, price, stakeUSDT };
    }
  }

  // ── Close funding position ──────────────────────────────────
  async closeFundingPosition(symbol, qty, direction) {
    const baseSymbol = symbol.replace('USDT', '');
    const spotSym    = `${baseSymbol}USDT`;
    if (direction === 'SHORT_PERP') {
      await this.placeSpotOrder(spotSym, 'Sell', qty);
      await this.placePerpOrder(symbol, 'Buy', qty);
    } else {
      await this.placeSpotOrder(spotSym, 'Buy', qty);
      await this.placePerpOrder(symbol, 'Sell', qty);
    }
  }

  // ── Validate keys ───────────────────────────────────────────
  async validateKeys() {
    try {
      await this.getBalance('USDT');
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }
}

module.exports = BybitClient;
