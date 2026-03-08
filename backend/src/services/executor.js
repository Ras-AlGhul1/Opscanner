/**
 * ArbitraxAI Auto-Trade Executor
 * Runs alongside the scanner. Every 30 seconds it:
 *   1. Fetches all users with auto-trade enabled
 *   2. Decrypts their exchange API keys
 *   3. Finds live opportunities on their exchanges
 *   4. Checks their rules
 *   5. Executes trades and logs everything to Supabase
 *
 * ArbitraxAI charges 10% of profits as platform fee.
 */

const crypto    = require('crypto');
const supabase  = require('../supabase');
const BinanceClient = require('./binance');
const BybitClient   = require('./bybit');
const { shouldExecute, getStake } = require('./tradingRules');

const PLATFORM_FEE_PCT = 0.10; // 10% of profit
const ENC_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '0'.repeat(64), 'hex');

// ── Encryption helpers ────────────────────────────────────────
function encrypt(text) {
  const iv         = crypto.randomBytes(16);
  const cipher     = crypto.createCipheriv('aes-256-cbc', ENC_KEY, iv);
  const encrypted  = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const [ivHex, encHex] = text.split(':');
  const iv        = Buffer.from(ivHex, 'hex');
  const enc       = Buffer.from(encHex, 'hex');
  const decipher  = crypto.createDecipheriv('aes-256-cbc', ENC_KEY, iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

// ── Log trade to Supabase ─────────────────────────────────────
async function logTrade(userId, trade) {
  const profitUSDT = trade.profitUSDT ?? 0;
  const fee        = profitUSDT > 0 ? profitUSDT * PLATFORM_FEE_PCT : 0;

  const { error } = await supabase.from('trades').insert({
    user_id:       userId,
    strategy:      trade.strategy,
    exchange:      trade.exchange,
    symbol:        trade.symbol ?? trade.path,
    stake_usdt:    trade.stakeUSDT,
    pnl_usdt:      profitUSDT,
    fee_usdt:      fee,
    net_pnl_usdt:  profitUSDT - fee,
    status:        trade.error ? 'failed' : 'completed',
    error_message: trade.error ?? null,
    metadata:      trade,
  });
  if (error) console.error('[EXECUTOR] Failed to log trade:', error.message);
}

// ── Triangular arbitrage for one user ────────────────────────
async function runTriangular(userId, rules, keys) {
  if (!keys.binanceKey || !keys.binanceSecret) return;

  const client = new BinanceClient(decrypt(keys.binanceKey), decrypt(keys.binanceSecret));
  let opps;

  try {
    opps = await client.findTriangularOpportunities('USDT', rules.minProfitPct ?? 0.15);
  } catch (err) {
    console.error(`[EXECUTOR][Binance] Scan error for user ${userId}:`, err.message);
    return;
  }

  for (const opp of opps) {
    const decision = shouldExecute(rules, { ...opp, type: 'triangular' });
    if (!decision || !decision.execute) continue;

    // Check USDT balance
    let balance;
    try { balance = await client.getBalance('USDT'); } catch { continue; }
    const stake = Math.min(decision.stake, balance * 0.95); // never use more than 95% of balance
    if (stake < 10) { console.log(`[EXECUTOR] Insufficient balance for user ${userId}`); continue; }

    console.log(`[EXECUTOR] Executing triangular arb for user ${userId}: ${opp.path} — ${opp.profitPct}% profit, $${stake} stake`);

    try {
      const result = await client.executeTriangular(opp.path, opp.legs, stake);
      await logTrade(userId, { ...result, strategy: 'triangular', exchange: 'Binance', symbol: opp.path });
      console.log(`[EXECUTOR] ✅ Triangular complete: +$${result.profitUSDT?.toFixed(2)}`);
    } catch (err) {
      console.error(`[EXECUTOR] ❌ Triangular failed:`, err.message);
      await logTrade(userId, { strategy: 'triangular', exchange: 'Binance', stakeUSDT: stake, profitUSDT: 0, error: err.message });
    }

    // Only execute one opportunity per cycle per user
    break;
  }
}

// ── Funding rate arbitrage for one user ───────────────────────
async function runFunding(userId, rules, keys) {
  if (!keys.bybitKey || !keys.bybitSecret) return;

  const client = new BybitClient(decrypt(keys.bybitKey), decrypt(keys.bybitSecret));

  // Check for existing open positions first
  const { data: openPositions } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'open')
    .eq('exchange', 'Bybit');

  // Close positions where funding has been collected (open > 8 hours)
  for (const pos of openPositions ?? []) {
    const ageHours = (Date.now() - new Date(pos.opened_at).getTime()) / 3600000;
    if (ageHours >= 8) {
      try {
        await client.closeFundingPosition(pos.symbol, pos.qty, pos.direction);
        const fundingCollected = parseFloat(pos.stake_usdt) * Math.abs(parseFloat(pos.funding_rate));
        await supabase.from('positions').update({ status: 'closed', closed_at: new Date().toISOString(), pnl_usdt: fundingCollected }).eq('id', pos.id);
        await logTrade(userId, { strategy: 'funding', exchange: 'Bybit', symbol: pos.symbol, stakeUSDT: pos.stake_usdt, profitUSDT: fundingCollected });
        console.log(`[EXECUTOR] ✅ Funding position closed: +$${fundingCollected.toFixed(4)}`);
      } catch (err) {
        console.error(`[EXECUTOR] ❌ Failed to close position ${pos.id}:`, err.message);
      }
    }
  }

  // If user already has max positions open, skip
  const maxPositions = rules.maxFundingPositions ?? 3;
  if ((openPositions?.length ?? 0) >= maxPositions) return;

  // Find new funding opportunities
  let opps;
  try {
    opps = await client.findFundingOpportunities(rules.minFundingRatePct ?? 0.05);
  } catch (err) {
    console.error(`[EXECUTOR][Bybit] Scan error:`, err.message);
    return;
  }

  for (const opp of opps) {
    const decision = shouldExecute(rules, { ...opp, type: 'funding', profitPct: opp.fundingRatePct });
    if (!decision || !decision.execute) continue;

    // Don't open same symbol twice
    const alreadyOpen = openPositions?.some(p => p.symbol === opp.symbol);
    if (alreadyOpen) continue;

    let balance;
    try { balance = await client.getBalance('USDT'); } catch { continue; }
    const stake = Math.min(decision.stake, balance * 0.4); // max 40% per position
    if (stake < 20) continue;

    console.log(`[EXECUTOR] Opening funding position: ${opp.symbol} ${opp.direction} — ${opp.fundingRatePct}% rate, $${stake}`);

    try {
      const result = await client.openFundingPosition(opp.symbol, stake, opp.direction);
      await supabase.from('positions').insert({
        user_id:      userId,
        exchange:     'Bybit',
        symbol:       opp.symbol,
        direction:    opp.direction,
        qty:          result.qty,
        stake_usdt:   stake,
        funding_rate: opp.fundingRate,
        opened_at:    new Date().toISOString(),
        status:       'open',
        next_funding: opp.nextFunding,
      });
      console.log(`[EXECUTOR] ✅ Funding position opened: ${opp.symbol}`);
    } catch (err) {
      console.error(`[EXECUTOR] ❌ Funding open failed:`, err.message);
      await logTrade(userId, { strategy: 'funding', exchange: 'Bybit', symbol: opp.symbol, stakeUSDT: stake, profitUSDT: 0, error: err.message });
    }
    break;
  }
}

// ── Main executor loop ────────────────────────────────────────
async function runExecutor() {
  const { data: users } = await supabase
    .from('user_trading_rules')
    .select('user_id, rules, exchange_keys')
    .eq('enabled', true);

  if (!users?.length) return;

  for (const user of users) {
    const { user_id, rules, exchange_keys } = user;

    // Get daily P&L for loss limit check
    const today = new Date().toISOString().split('T')[0];
    const { data: todayTrades } = await supabase
      .from('trades')
      .select('net_pnl_usdt')
      .eq('user_id', user_id)
      .gte('created_at', today);

    const dailyPnl = todayTrades?.reduce((s, t) => s + (t.net_pnl_usdt ?? 0), 0) ?? 0;
    const rulesWithPnl = { ...rules, dailyPnl };

    const strategies = rules.strategy ?? [];

    await Promise.allSettled([
      strategies.includes('triangular') ? runTriangular(user_id, rulesWithPnl, exchange_keys) : Promise.resolve(),
      strategies.includes('funding')    ? runFunding(user_id, rulesWithPnl, exchange_keys)    : Promise.resolve(),
    ]);
  }
}

function startExecutor() {
  console.log('[EXECUTOR] Starting auto-trade executor...');
  // Run immediately, then every 30 seconds
  setTimeout(() => runExecutor(), 5000);
  setInterval(() => runExecutor(), 30 * 1000);
}

module.exports = { startExecutor, encrypt, decrypt };
