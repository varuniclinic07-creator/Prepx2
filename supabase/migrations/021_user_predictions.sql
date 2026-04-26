CREATE TABLE user_predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    predicted_rank_min INT,
    predicted_rank_max INT,
    confidence_pct INT,
    deficit_gaps JSONB DEFAULT '[]'::jsonb,
    days_to_cutoff INT,
    created_at TIMESTAMPTZ DEFAULT now()
);
