-- Add enhanced Cloudflare analytics columns
ALTER TABLE analytics ADD COLUMN region TEXT;
ALTER TABLE analytics ADD COLUMN region_code TEXT;
ALTER TABLE analytics ADD COLUMN continent TEXT;
ALTER TABLE analytics ADD COLUMN timezone TEXT;
ALTER TABLE analytics ADD COLUMN postal_code TEXT;
ALTER TABLE analytics ADD COLUMN latitude REAL;
ALTER TABLE analytics ADD COLUMN longitude REAL;
ALTER TABLE analytics ADD COLUMN asn INTEGER;
ALTER TABLE analytics ADD COLUMN as_organization TEXT;
ALTER TABLE analytics ADD COLUMN colo TEXT;
ALTER TABLE analytics ADD COLUMN http_protocol TEXT;
ALTER TABLE analytics ADD COLUMN tls_version TEXT;
ALTER TABLE analytics ADD COLUMN bot_category TEXT;
ALTER TABLE analytics ADD COLUMN device_type TEXT;
ALTER TABLE analytics ADD COLUMN client_tcp_rtt INTEGER;

-- Create additional indexes for new analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_region ON analytics(region);
CREATE INDEX IF NOT EXISTS idx_analytics_continent ON analytics(continent);
CREATE INDEX IF NOT EXISTS idx_analytics_asn ON analytics(asn);
CREATE INDEX IF NOT EXISTS idx_analytics_colo ON analytics(colo);
CREATE INDEX IF NOT EXISTS idx_analytics_device_type ON analytics(device_type);