const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// ─── Constants ────────────────────────────────────────────────
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
const ALLOWED_CATEGORIES = [
  'Sports Betting', 'Crypto Arbitrage', 'Product Reselling', 'Price Mistakes', 'Discounts',
];
const ALLOWED_SORTS = ['newest', 'profit', 'confidence'];

// ─── Fix 2: Auth middleware — validate Supabase JWT on all routes ─
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = data.user;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// ─── Fix 10: Timeout wrapper for Supabase queries ─────────────
async function withTimeout(promise, ms = 8000) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Query timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}

// GET /api/opportunities
router.get('/', requireAuth, async (req, res) => {
  try {
    let {
      category,
      sort = 'newest',
      limit = DEFAULT_LIMIT,
      offset = 0,
      min_confidence,
      min_profit,
    } = req.query;

    // Fix 3: Cap and sanitize all numeric inputs
    limit = Math.min(Math.max(parseInt(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    offset = Math.max(parseInt(offset) || 0, 0);

    // Whitelist category and sort to prevent injection
    if (category && !ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    if (!ALLOWED_SORTS.includes(sort)) sort = 'newest';

    // Sanitize numeric filters
    const minConfidence = min_confidence ? Math.min(Math.max(parseInt(min_confidence), 0), 100) : null;
    const minProfit = min_profit ? Math.max(parseFloat(min_profit), 0) : null;

    let query = supabase.from('opportunities').select('*');

    if (category) query = query.eq('category', category);
    if (minConfidence !== null) query = query.gte('confidence_score', minConfidence);
    if (minProfit !== null) query = query.gte('estimated_profit', minProfit);

    if (sort === 'profit') {
      query = query.order('estimated_profit', { ascending: false });
    } else if (sort === 'confidence') {
      query = query.order('confidence_score', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    // Fix 10: Apply timeout
    const { data, error } = await withTimeout(query);
    if (error) throw error;

    res.json(data ?? []);
  } catch (err) {
    console.error('GET /opportunities error:', err.message);
    // Fix 4: Never send raw error messages to client
    if (err.message === 'Query timeout') {
      return res.status(504).json({ error: 'Request timed out' });
    }
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

// GET /api/opportunities/stats/summary
router.get('/stats/summary', requireAuth, async (req, res) => {
  try {
    const { data, error } = await withTimeout(
      supabase.from('opportunities').select('category, estimated_profit, confidence_score')
    );
    if (error) throw error;

    const total = data.length;
    if (total === 0) return res.json({ total: 0, totalProfit: 0, avgConfidence: 0, byCategory: {} });

    const totalProfit = data.reduce((s, o) => s + o.estimated_profit, 0);
    const avgConfidence = data.reduce((s, o) => s + o.confidence_score, 0) / total;
    const byCategory = data.reduce((acc, o) => {
      acc[o.category] = (acc[o.category] || 0) + 1;
      return acc;
    }, {});

    res.json({ total, totalProfit, avgConfidence, byCategory });
  } catch (err) {
    console.error('GET /stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/opportunities/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    // Basic UUID format check
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const { data, error } = await withTimeout(
      supabase.from('opportunities').select('*').eq('id', req.params.id).single()
    );
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (err) {
    console.error('GET /opportunities/:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch opportunity' });
  }
});

module.exports = router;
