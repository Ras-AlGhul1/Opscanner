const { v4: uuidv4 } = require('uuid');
const supabase = require('../supabase');

// ─── Data Templates ────────────────────────────────────────────────────────────

const SPORTS_TEAMS = [
  'Lakers', 'Celtics', 'Warriors', 'Heat', 'Bucks',
  'Chiefs', 'Eagles', 'Cowboys', '49ers', 'Ravens',
  'Yankees', 'Dodgers', 'Astros', 'Braves', 'Mets',
  'Man United', 'Real Madrid', 'Barcelona', 'Bayern', 'PSG',
];

const CRYPTO_PAIRS = [
  { base: 'BTC', quote: 'USDT' },
  { base: 'ETH', quote: 'USDT' },
  { base: 'SOL', quote: 'USDT' },
  { base: 'BNB', quote: 'USDT' },
  { base: 'XRP', quote: 'USDT' },
  { base: 'ADA', quote: 'USDT' },
  { base: 'AVAX', quote: 'USDT' },
  { base: 'DOT', quote: 'USDT' },
];

const CRYPTO_EXCHANGES = [
  'Binance', 'Coinbase', 'Kraken', 'Bybit', 'OKX', 'Bitfinex', 'Gemini',
];

const PRODUCTS = [
  { name: 'PlayStation 5', category: 'Gaming', msrp: 499 },
  { name: 'RTX 4090', category: 'GPU', msrp: 1599 },
  { name: 'iPhone 16 Pro Max', category: 'Phones', msrp: 1199 },
  { name: 'Nike Air Jordan 1 Chicago', category: 'Sneakers', msrp: 180 },
  { name: 'Dyson V15 Vacuum', category: 'Home', msrp: 749 },
  { name: 'MacBook Pro M4', category: 'Laptops', msrp: 1999 },
  { name: 'Supreme Box Logo Hoodie', category: 'Fashion', msrp: 168 },
  { name: 'Rolex Datejust', category: 'Watches', msrp: 7550 },
  { name: 'LEGO Star Wars Millennium Falcon', category: 'Toys', msrp: 849 },
  { name: 'Yeezy Boost 350 V2', category: 'Sneakers', msrp: 220 },
];

const DISCOUNT_STORES = [
  'Amazon', 'Best Buy', 'Walmart', 'Target', 'Costco',
  'Newegg', 'B&H Photo', 'eBay', 'ASOS', 'Nike.com',
];

const SPORTSBOOKS = [
  'DraftKings', 'FanDuel', 'BetMGM', 'Caesars', 'PointsBet',
  'BetRivers', 'Unibet', 'bet365',
];

const PRICE_ERROR_SOURCES = [
  'Amazon Warehouse', 'Walmart.com', 'Target.com',
  'Best Buy Outlet', 'Costco.com', 'Newegg Flash',
];

// ─── Generators ───────────────────────────────────────────────────────────────

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSportsBet() {
  const teamA = pick(SPORTS_TEAMS);
  let teamB = pick(SPORTS_TEAMS);
  while (teamB === teamA) teamB = pick(SPORTS_TEAMS);

  const spreadA = (Math.random() * 8 - 4).toFixed(1);
  const oddsA = randInt(-150, 150);
  const oddsB = randInt(-150, 150);
  const bookA = pick(SPORTSBOOKS);
  const bookB = pick(SPORTSBOOKS.filter(b => b !== bookA));

  const profit = parseFloat((rand(80, 600)).toFixed(2));
  const confidence = randInt(55, 92);

  return {
    id: uuidv4(),
    title: `Arbitrage: ${teamA} vs ${teamB}`,
    description: `${bookA} offers ${teamA} at ${oddsA > 0 ? '+' : ''}${oddsA} while ${bookB} has ${teamB} at ${oddsA > 0 ? '+' : ''}${oddsB}. Spread of ${spreadA} creates a guaranteed arbitrage window with ~${confidence}% edge.`,
    category: 'Sports Betting',
    estimated_profit: profit,
    confidence_score: confidence,
    source: `${bookA} vs ${bookB}`,
    source_url: null,
    created_at: new Date().toISOString(),
    metadata: { teamA, teamB, bookA, bookB, oddsA, oddsB, spread: spreadA },
  };
}

function generateCryptoArb() {
  const pair = pick(CRYPTO_PAIRS);
  const exA = pick(CRYPTO_EXCHANGES);
  let exB = pick(CRYPTO_EXCHANGES);
  while (exB === exA) exB = pick(CRYPTO_EXCHANGES);

  const basePrice = pair.base === 'BTC' ? rand(40000, 72000)
    : pair.base === 'ETH' ? rand(2200, 4000)
    : pair.base === 'SOL' ? rand(80, 200)
    : rand(1, 500);

  const priceDiff = rand(0.1, 2.5);
  const priceA = (basePrice * (1 + priceDiff / 200)).toFixed(2);
  const priceB = (basePrice * (1 - priceDiff / 200)).toFixed(2);

  const profit = parseFloat((rand(120, 2500)).toFixed(2));
  const confidence = randInt(60, 95);

  return {
    id: uuidv4(),
    title: `${pair.base}/${pair.quote} Arbitrage: ${exA} → ${exB}`,
    description: `${pair.base} trading at $${priceA} on ${exA} vs $${priceB} on ${exB}. ${priceDiff.toFixed(2)}% price discrepancy after fees. Window estimated ${randInt(3, 15)} minutes.`,
    category: 'Crypto Arbitrage',
    estimated_profit: profit,
    confidence_score: confidence,
    source: `${exA} / ${exB}`,
    source_url: null,
    created_at: new Date().toISOString(),
    metadata: { pair: `${pair.base}/${pair.quote}`, exA, exB, priceA, priceB, priceDiff: priceDiff.toFixed(3) },
  };
}

function generateProductResell() {
  const product = pick(PRODUCTS);
  const buyStore = pick(DISCOUNT_STORES);
  const sellMultiplier = rand(1.15, 1.8);
  const buyPrice = parseFloat((product.msrp * rand(0.6, 0.9)).toFixed(2));
  const sellPrice = parseFloat((buyPrice * sellMultiplier).toFixed(2));
  const profit = parseFloat((sellPrice - buyPrice - rand(5, 25)).toFixed(2));
  const confidence = randInt(45, 85);

  return {
    id: uuidv4(),
    title: `Resell Opportunity: ${product.name}`,
    description: `${product.name} available at ${buyStore} for $${buyPrice} (${Math.round((1 - buyPrice / product.msrp) * 100)}% below MSRP). Current resale value on eBay/StockX ~$${sellPrice}. After fees: ~$${profit} profit.`,
    category: 'Product Reselling',
    estimated_profit: profit,
    confidence_score: confidence,
    source: buyStore,
    source_url: null,
    created_at: new Date().toISOString(),
    metadata: { product: product.name, category: product.category, buyPrice, sellPrice, msrp: product.msrp },
  };
}

function generatePriceMistake() {
  const product = pick(PRODUCTS);
  const store = pick(PRICE_ERROR_SOURCES);
  const errorDiscount = rand(0.3, 0.75);
  const errorPrice = parseFloat((product.msrp * (1 - errorDiscount)).toFixed(2));
  const profit = parseFloat((product.msrp - errorPrice - rand(10, 30)).toFixed(2));
  const confidence = randInt(35, 75);

  return {
    id: uuidv4(),
    title: `⚡ Price Error: ${product.name} at ${store}`,
    description: `Possible pricing error detected! ${product.name} listed at $${errorPrice} on ${store} vs typical retail of $${product.msrp}. Discount of ${Math.round(errorDiscount * 100)}%. Act fast — these windows close in minutes.`,
    category: 'Price Mistakes',
    estimated_profit: profit,
    confidence_score: confidence,
    source: store,
    source_url: null,
    created_at: new Date().toISOString(),
    metadata: { product: product.name, errorPrice, msrp: product.msrp, discountPct: Math.round(errorDiscount * 100) },
  };
}

function generateDiscount() {
  const product = pick(PRODUCTS);
  const store = pick(DISCOUNT_STORES);
  const discount = rand(0.2, 0.55);
  const salePrice = parseFloat((product.msrp * (1 - discount)).toFixed(2));
  const savings = parseFloat((product.msrp - salePrice).toFixed(2));
  const confidence = randInt(70, 97);

  return {
    id: uuidv4(),
    title: `${Math.round(discount * 100)}% Off: ${product.name}`,
    description: `${product.name} is on sale at ${store} for $${salePrice} (was $${product.msrp}). Save $${savings}. Historically lowest price point in the past 6 months. High demand — limited stock.`,
    category: 'Discounts',
    estimated_profit: savings,
    confidence_score: confidence,
    source: store,
    source_url: null,
    created_at: new Date().toISOString(),
    metadata: { product: product.name, salePrice, msrp: product.msrp, savings, discountPct: Math.round(discount * 100) },
  };
}

// ─── Scanner Engine ────────────────────────────────────────────────────────────

const GENERATORS = [
  generateSportsBet,
  generateCryptoArb,
  generateProductResell,
  generatePriceMistake,
  generateDiscount,
];

async function generateBatch(count = 5) {
  const batch = [];
  const used = new Set();

  for (let i = 0; i < count; i++) {
    let gen;
    // Avoid too many of the same type in one batch
    do {
      gen = pick(GENERATORS);
    } while (used.size < GENERATORS.length && used.has(gen));
    used.add(gen);

    batch.push(gen());
  }

  const { error } = await supabase.from('opportunities').insert(batch);
  if (error) {
    console.error('[SCANNER] Insert error:', error.message);
    return;
  }

  console.log(`[SCANNER] Generated ${batch.length} new opportunities at ${new Date().toISOString()}`);
}

async function cleanOldOpportunities() {
  // Keep only last 500 opportunities to prevent table bloat
  const { data } = await supabase
    .from('opportunities')
    .select('id')
    .order('created_at', { ascending: false })
    .range(500, 10000);

  if (data && data.length > 0) {
    const idsToDelete = data.map(r => r.id);
    await supabase.from('opportunities').delete().in('id', idsToDelete);
    console.log(`[SCANNER] Cleaned ${idsToDelete.length} old opportunities`);
  }
}

function startScanner() {
  // Initial batch on startup
  setTimeout(() => generateBatch(15), 2000);

  // Generate new opportunities every 2 minutes
  setInterval(async () => {
    await generateBatch(randInt(2, 6));
  }, 2 * 60 * 1000);

  // Clean old opportunities every 30 minutes
  setInterval(async () => {
    await cleanOldOpportunities();
  }, 30 * 60 * 1000);
}

module.exports = { startScanner, generateBatch, generateSportsBet, generateCryptoArb, generateProductResell, generatePriceMistake, generateDiscount };
