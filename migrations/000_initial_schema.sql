-- Initial schema for Short URL Manager
-- This creates all tables and indexes in one migration for fresh installations

-- Create links table
CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    short_code TEXT UNIQUE NOT NULL,
    destination_url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    click_count INTEGER DEFAULT 0,
    last_clicked DATETIME,
    notes TEXT
);

-- Create analytics table for tracking clicks
CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link_id INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    referer TEXT,
    country TEXT,
    city TEXT,
    region TEXT,
    region_code TEXT,
    continent TEXT,
    timezone TEXT,
    postal_code TEXT,
    latitude REAL,
    longitude REAL,
    asn INTEGER,
    as_organization TEXT,
    colo TEXT,
    http_protocol TEXT,
    tls_version TEXT,
    bot_category TEXT,
    device_type TEXT,
    client_tcp_rtt INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_links_short_code ON links(short_code);
CREATE INDEX IF NOT EXISTS idx_analytics_link_id ON analytics(link_id);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_country ON analytics(country);
CREATE INDEX IF NOT EXISTS idx_analytics_region ON analytics(region);
CREATE INDEX IF NOT EXISTS idx_analytics_continent ON analytics(continent);
CREATE INDEX IF NOT EXISTS idx_analytics_asn ON analytics(asn);
CREATE INDEX IF NOT EXISTS idx_analytics_colo ON analytics(colo);
CREATE INDEX IF NOT EXISTS idx_analytics_device_type ON analytics(device_type);