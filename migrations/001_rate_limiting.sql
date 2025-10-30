-- Migration: Add rate limiting table
-- Purpose: Track failed authentication attempts by IP address to prevent brute force attacks

CREATE TABLE IF NOT EXISTS rate_limit (
    ip_address TEXT PRIMARY KEY,
    failed_attempts INTEGER DEFAULT 0,
    first_attempt_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_attempt_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    blocked_until DATETIME
);

-- Index for efficient cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_rate_limit_blocked_until ON rate_limit(blocked_until);
CREATE INDEX IF NOT EXISTS idx_rate_limit_last_attempt ON rate_limit(last_attempt_at);
