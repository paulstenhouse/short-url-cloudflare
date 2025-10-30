-- Create links table
CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    short_code TEXT UNIQUE NOT NULL,
    destination_url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'admin',
    click_count INTEGER DEFAULT 0
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_links_short_code ON links(short_code);