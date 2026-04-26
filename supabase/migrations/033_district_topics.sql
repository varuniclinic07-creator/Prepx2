CREATE TABLE district_topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    UNIQUE(district_id, topic_id)
);
