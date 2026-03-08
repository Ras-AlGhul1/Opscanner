-- ============================================================
-- OpportunityScanner — Supabase PostgreSQL Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- ─── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── User Profiles ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  username    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Opportunities ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS opportunities (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  category          TEXT NOT NULL CHECK (category IN (
                      'Sports Betting',
                      'Crypto Arbitrage',
                      'Product Reselling',
                      'Price Mistakes',
                      'Discounts'
                    )),
  estimated_profit  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  confidence_score  INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
  source            TEXT NOT NULL,
  source_url        TEXT,
  expires_at        TIMESTAMPTZ,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast feed queries
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON opportunities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_category ON opportunities(category);
CREATE INDEX IF NOT EXISTS idx_opportunities_confidence ON opportunities(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_profit ON opportunities(estimated_profit DESC);

-- ─── Saved Opportunities ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_opportunities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id  UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, opportunity_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_user_id ON saved_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_opportunity_id ON saved_opportunities(opportunity_id);

-- ─── Row Level Security ───────────────────────────────────────

-- user_profiles: users can only read/update their own profile
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- opportunities: anyone authenticated can read; only service role can insert
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read opportunities"
  ON opportunities FOR SELECT
  TO authenticated
  USING (true);

-- saved_opportunities: users manage only their own saves
ALTER TABLE saved_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved opportunities"
  ON saved_opportunities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved opportunities"
  ON saved_opportunities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved opportunities"
  ON saved_opportunities FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Auto-update timestamp ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Sample Data (30 initial opportunities) ───────────────────
INSERT INTO opportunities (title, description, category, estimated_profit, confidence_score, source, created_at) VALUES

-- Sports Betting
('Arbitrage: Lakers vs Celtics', 'DraftKings offers Lakers at +140 while FanDuel has Celtics at -115. Cross-book arbitrage yields guaranteed 6.2% ROI on any $500 stake.', 'Sports Betting', 312.00, 88, 'DraftKings vs FanDuel', NOW() - INTERVAL '2 minutes'),
('Hedge: Chiefs -3.5 Line Gap', 'Chiefs -3.5 available at BetMGM at -108 vs Caesars at -115. 3.7% arbitrage window for $1000 bankroll. Window estimated 8 minutes.', 'Sports Betting', 245.50, 82, 'BetMGM vs Caesars', NOW() - INTERVAL '5 minutes'),
('MLB Arbitrage: Yankees vs Red Sox', 'Yankees moneyline gap detected: DraftKings -162 vs PointsBet -145. Place $800 on each side for risk-free $67 profit.', 'Sports Betting', 156.00, 75, 'DraftKings vs PointsBet', NOW() - INTERVAL '12 minutes'),
('EPL: Man City vs Arsenal Spread Gap', 'Man City -1.5 at bet365 for -110 vs FanDuel at -125 creates 4.8% arbitrage. Short window before lines adjust.', 'Sports Betting', 198.00, 79, 'bet365 vs FanDuel', NOW() - INTERVAL '18 minutes'),

-- Crypto Arbitrage
('BTC/USDT Arb: Binance → Coinbase', 'Bitcoin trading at $68,420 on Binance vs $69,105 on Coinbase. 1.0% price gap after estimated 0.25% fees each side. 11-minute window.', 'Crypto Arbitrage', 847.00, 91, 'Binance / Coinbase', NOW() - INTERVAL '1 minute'),
('ETH/USDT Spread: Kraken → OKX', 'Ethereum at $3,280 on Kraken vs $3,312 on OKX. 0.97% spread nets ~$312 per 10 ETH traded. Transfer time ~6 minutes.', 'Crypto Arbitrage', 312.00, 87, 'Kraken / OKX', NOW() - INTERVAL '4 minutes'),
('SOL/USDT: Bybit → Coinbase Gap', 'Solana showing 1.4% divergence: Bybit $147.20 vs Coinbase $149.28. High liquidity window. Estimated profit: $1,204 on 60 SOL.', 'Crypto Arbitrage', 1204.00, 84, 'Bybit / Coinbase', NOW() - INTERVAL '7 minutes'),
('XRP Triangular Arb: Binance', 'XRP → ETH → USDT → XRP triangular arbitrage loop detected on Binance. 0.82% net gain per cycle after fees. 5-cycle limit before market corrects.', 'Crypto Arbitrage', 523.00, 78, 'Binance', NOW() - INTERVAL '15 minutes'),
('BNB/USDT: OKX vs Bitfinex', 'BNB trading at $428.50 on OKX vs $432.80 on Bitfinex. 1.0% spread. Low withdrawal fees on this route maximize net profit.', 'Crypto Arbitrage', 430.00, 81, 'OKX / Bitfinex', NOW() - INTERVAL '22 minutes'),

-- Product Reselling
('Resell: PS5 Disc Edition Restock', 'PS5 back in stock at Walmart for $499. eBay resale currently $620–$680. After 13% eBay fees: ~$120–$180 profit per unit. Limit 2 per customer.', 'Product Reselling', 147.00, 73, 'Walmart', NOW() - INTERVAL '8 minutes'),
('Resell: Nike Dunk Low Panda Drop', 'Nike SNKRS raffle for Dunk Low Panda ($110). StockX market value $285. After fees: ~$155 profit. Enter raffle before 11:59PM EST.', 'Product Reselling', 155.00, 68, 'Nike SNKRS', NOW() - INTERVAL '25 minutes'),
('Resell: LEGO 10332 Medieval Town', 'LEGO retiring set 10332 sells at Target for $229. BrickLink average: $410. 79% ROI after shipping. Limited shelf stock confirmed at 3 locations.', 'Product Reselling', 164.00, 71, 'Target / BrickLink', NOW() - INTERVAL '35 minutes'),
('Resell: GPU RTX 4090 Stock Alert', 'RTX 4090 Founders Edition back at Best Buy $1,599. eBay sold listings avg $2,100. Net profit after fees: ~$435. Extreme demand expected.', 'Product Reselling', 435.00, 76, 'Best Buy', NOW() - INTERVAL '45 minutes'),

-- Price Mistakes
('⚡ Price Error: Dyson V15 at $89', 'Dyson V15 Detect vacuum listed at $89 on Amazon Warehouse (MSRP $749). Likely pricing error. Cancel-friendly — buy now before correction. ~660% below retail.', 'Price Mistakes', 620.00, 52, 'Amazon Warehouse', NOW() - INTERVAL '3 minutes'),
('⚡ Price Error: MacBook Pro M4 $649', 'MacBook Pro M4 14" listed at $649 on Walmart.com (MSRP $1,999). Multiple users confirming checkout works. Price likely error. Order now.', 'Price Mistakes', 1280.00, 48, 'Walmart.com', NOW() - INTERVAL '10 minutes'),
('⚡ Price Error: Rolex at $412', 'Rolex Datejust listed at $412 on eBay listing — likely mislabeled or typo. Seller has 99.8% feedback. Worth the risk at this price point.', 'Price Mistakes', 6900.00, 35, 'eBay', NOW() - INTERVAL '20 minutes'),
('⚡ Hotel Rate Error: Ritz $38/night', 'The Ritz-Carlton NYC showing $38/night for 3 nights in April on Hotels.com. FHRD honored historically. Book now — cancel if not honored.', 'Price Mistakes', 1200.00, 41, 'Hotels.com', NOW() - INTERVAL '30 minutes'),

-- Discounts
('40% Off: Sony WH-1000XM5 Headphones', 'Sony XM5 headphones at $179 on Amazon (was $299). Price match available at Best Buy. All-time low price. Prime shipping.', 'Discounts', 120.00, 94, 'Amazon', NOW() - INTERVAL '6 minutes'),
('55% Off: Ninja Dual Brew Coffee Maker', 'Ninja Dual Brew Pro at $99 (was $219) at Target. Stack with 10% RedCard discount = $89.10. Lowest price since Black Friday 2023.', 'Discounts', 124.00, 92, 'Target', NOW() - INTERVAL '14 minutes'),
('35% Off: Apple AirPods Pro 2', 'AirPods Pro 2 at $169 at Costco — $80 off retail. No membership required if ordered online. Ships in 2 days. Price valid through Sunday.', 'Discounts', 80.00, 96, 'Costco', NOW() - INTERVAL '28 minutes'),
('45% Off: Weber Spirit Gas Grill', 'Weber Spirit II E-310 at $329 (reg $599) at Home Depot. Spring clearance. Extra 10% off with credit card. Pickup available same day.', 'Discounts', 240.00, 89, 'Home Depot', NOW() - INTERVAL '40 minutes'),
('30% Off: Vitamix 5200 Blender', 'Vitamix 5200 at $279 (reg $399) on Vitamix.com with code SPRING30. 7-year warranty included. Refurb models also available at $199.', 'Discounts', 120.00, 91, 'Vitamix.com', NOW() - INTERVAL '55 minutes'),

-- More variety
('BTC/ETH Ratio Trade: Binance Futures', 'BTC/ETH ratio at 18.2x — historically high. Short BTC, long ETH for mean-reversion trade. Expected reversion to 16.8x within 72 hours.', 'Crypto Arbitrage', 1850.00, 72, 'Binance Futures', NOW() - INTERVAL '32 minutes'),
('UFC 312 Main Event Arb', 'UFC 312 main event: +180 on underdog at Unibet vs -165 on favorite at DraftKings. Guarantees 4.1% profit on $1,200 stake.', 'Sports Betting', 287.00, 80, 'Unibet vs DraftKings', NOW() - INTERVAL '50 minutes'),
('Resell: Supreme Box Logo Hoodie Drop', 'Supreme Box Logo Hoodie ($168) dropping Thursday. Instant resale value $450–$600 on Grailed. ~$250 profit. Use multiple accounts for better odds.', 'Product Reselling', 268.00, 64, 'Supreme', NOW() - INTERVAL '1 hour'),
('50% Off: Instant Pot Duo 7-in-1', 'Instant Pot Duo 8qt at $59.99 (was $119.99) on Amazon. Lightning deal — 47 minutes left. One of the top 5 all-time price drops for this model.', 'Discounts', 60.00, 97, 'Amazon Lightning Deal', NOW() - INTERVAL '1 hour 10 minutes'),
('⚡ Airline Error Fare: NYC→Tokyo $189', 'Error fare: JFK to Tokyo Narita $189 roundtrip on United (normal $1,100+). Departures in May/June. Book directly — airlines honoring most error fares this year.', 'Price Mistakes', 900.00, 58, 'United Airlines', NOW() - INTERVAL '1 hour 20 minutes'),
('AVAX/USDT: Binance → Bybit', 'Avalanche showing 1.3% spread: $38.20 on Binance vs $38.70 on Bybit. Fast finality on AVAX network makes transfer viable. 9-minute window.', 'Crypto Arbitrage', 375.00, 83, 'Binance / Bybit', NOW() - INTERVAL '1 hour 30 minutes'),
('NBA Playoffs First Basket Arb', 'First basket scorer prop: Curry at +250 (FanDuel) vs field at -200 (BetMGM). Arbitrage gap allows $300 guaranteed return with $1,200 total stake.', 'Sports Betting', 300.00, 71, 'FanDuel vs BetMGM', NOW() - INTERVAL '1 hour 45 minutes'),
('Resell: Pokémon 151 ETB Sealed', 'Pokémon 151 Elite Trainer Box at Target for $54.99. TCGPlayer market price $120–$145. ~$55 profit after fees. Very low stock — 1 unit spotted.', 'Product Reselling', 55.00, 69, 'Target / TCGPlayer', NOW() - INTERVAL '2 hours');

-- ─── Verify Setup ─────────────────────────────────────────────
SELECT 
  'Setup complete!' AS status,
  COUNT(*) AS opportunities_seeded
FROM opportunities;
