export type Category =
  | 'Sports Betting'
  | 'Crypto Arbitrage'
  | 'Crypto Trade'
  | 'Product Reselling'
  | 'Price Mistakes'
  | 'Discounts';

export type Region =
  | 'Global'
  | 'US'
  | 'UK'
  | 'EU'
  | 'Asia'
  | 'Australia'
  | 'Canada'
  | 'Nigeria';

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  category: Category;
  estimated_profit: number;
  confidence_score: number;
  source: string;
  source_url?: string;
  expires_at?: string | null;
  region?: Region;
  created_at: string;
  explanation?: string;
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
