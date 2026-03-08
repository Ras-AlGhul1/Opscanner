/**
 * Rule engine — reads each user's trading config and decides
 * whether to fire an execution for a given opportunity.
 */

function shouldExecute(rules, opportunity) {
  if (!rules || !rules.enabled) return false;

  const { strategy, minProfitPct, maxTradeUSDT, dailyLossLimit, dailyPnl } = rules;

  // Daily loss limit check
  if (dailyLossLimit && dailyPnl <= -Math.abs(dailyLossLimit)) {
    console.log(`[RULES] Daily loss limit hit for user — skipping`);
    return false;
  }

  // Strategy match
  if (opportunity.type === 'triangular' && !strategy.includes('triangular')) return false;
  if (opportunity.type === 'funding'    && !strategy.includes('funding'))    return false;

  // Profit threshold
  if (opportunity.profitPct < (minProfitPct ?? 0.1)) return false;

  // Trade size
  const stake = Math.min(opportunity.suggestedStake ?? maxTradeUSDT, maxTradeUSDT);
  if (stake < 10) return false; // minimum $10

  return { execute: true, stake };
}

function getStake(rules, opportunity) {
  const max = rules.maxTradeUSDT ?? 100;
  return Math.min(opportunity.suggestedStake ?? max, max);
}

module.exports = { shouldExecute, getStake };
