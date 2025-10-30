-- Create analytics table for tracking clicks
CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link_id INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    referer TEXT,
    country TEXT,
    city TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_link_id ON analytics(link_id);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_country ON analytics(country);