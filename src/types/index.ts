export interface GlucoseReading {
  id: string;
  user_id: string;
  value: number;
  created_at: string;
  image_url?: string;
  notes?: string;
  tag?: 'before_meal' | 'after_meal' | 'fasting' | 'other';
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}
