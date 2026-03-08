const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// GET /api/opportunities
router.get('/', async (req, res) => {
  try {
    const {
      category,
      sort = 'newest',
      limit = 50,
      offset = 0,
      min_confidence,
      min_profit,
    } = req.query;

    let query = supabase.from('opportunities').select('*', { count: 'exact' });

    // Filters
    if (category) query = query.eq('category', category);
    if (min_confidence) query = query.gte('confidence_score', parseInt(min_confidence));
    if (min_profit) query = query.gte('estimated_profit', parseFloat(min_profit));

    // Sort
    if (sort === 'profit') {
      query = query.order('estimated_profit', { ascending: false });
    } else if (sort === 'confidence') {
      query = query.order('confidence_score', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json(data ?? []);
  } catch (err) {
    console.error('GET /opportunities error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/opportunities/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/opportunities/stats/summary
router.get('/stats/summary', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select('category, estimated_profit, confidence_score');
    if (error) throw error;

    const total = data.length;
    const totalProfit = data.reduce((s, o) => s + o.estimated_profit, 0);
    const avgConfidence = data.reduce((s, o) => s + o.confidence_score, 0) / total;

    const byCategory = data.reduce((acc, o) => {
      acc[o.category] = (acc[o.category] || 0) + 1;
      return acc;
    }, {});

    res.json({ total, totalProfit, avgConfidence, byCategory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
