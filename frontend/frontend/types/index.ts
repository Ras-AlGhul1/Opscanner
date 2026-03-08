export type Category =
  | 'Sports Betting'
  | 'Crypto Arbitrage'
  | 'Product Reselling'
  | 'Price Mistakes'
  | 'Discounts';

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  category: Category;
  estimated_profit: number;
  confidence_score: number;
  source: string;
  source_url?: string;
  expires_at?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface SavedOpportunity {
  id: string;
  user_id: string;
  opportunity_id: string;
  created_at: string;
  opportunity: Opportunity;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  created_at: string;
}
