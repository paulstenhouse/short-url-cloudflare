# Rate Limiting Implementation

## Overview

IP-based rate limiting has been implemented to protect against brute force attacks on admin authentication endpoints. This uses Cloudflare D1 database to track failed authentication attempts.

## How It Works

### Configuration

Rate limiting is configured via environment variables in `wrangler.toml`:

```toml
RATE_LIMIT_MAX_ATTEMPTS = "10"        # Max failed auth attempts per window
RATE_LIMIT_WINDOW_MINUTES = "15"     # Time window in minutes
RATE_LIMIT_BLOCK_DURATION_MINUTES = "60"  # How long to block after exceeding limit
```

**Default Behavior:**
- Allow 10 failed authentication attempts within a 15-minute window
- After exceeding the limit, block the IP address for 60 minutes
- Successful authentication clears all failed attempts for that IP

### Protected Endpoints

Rate limiting is applied to:
- `GET/POST/PUT/DELETE /api/admin/*` - All admin API endpoints
- `GET /analytics/{shortCode}?key=KEY` - Analytics page

### Database Schema

A new table `rate_limit` tracks attempts:

```sql
CREATE TABLE rate_limit (
    ip_address TEXT PRIMARY KEY,
    failed_attempts INTEGER DEFAULT 0,
    first_attempt_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_attempt_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    blocked_until DATETIME
);
```

## Deployment

### 1. Apply Database Migration

Run the migration to create the rate limiting table:

```bash
# Apply the migration
wrangler d1 migrations apply go

# Verify the migration
wrangler d1 execute go --command "SELECT name FROM sqlite_master WHERE type='table' AND name='rate_limit';"
```

### 2. Deploy Updated Worker

```bash
wrangler deploy
```

### 3. Verify Configuration

Check that environment variables are set:

```bash
wrangler tail
# Make a request and check logs
```

## Testing Rate Limiting

### Test 1: Normal Request (Should Succeed)

```bash
# With correct key
curl https://your-worker.workers.dev/api/admin/links?key=YOUR_ADMIN_KEY
# Expected: 200 OK with links data
```

### Test 2: Failed Authentication (Should Increment Counter)

```bash
# With wrong key
for i in {1..5}; do
  curl -i https://your-worker.workers.dev/api/admin/links?key=wrong-key
  echo "Attempt $i"
done
# Expected: 401 Unauthorized for each attempt
```

### Test 3: Trigger Rate Limit (Should Block)

```bash
# Make 11 failed attempts
for i in {1..11}; do
  curl -i https://your-worker.workers.dev/api/admin/links?key=wrong-key
  echo "Attempt $i"
  sleep 1
done
# Expected:
# - Attempts 1-10: 401 Unauthorized
# - Attempt 11+: 429 Too Many Requests with retry-after
```

### Test 4: Verify Block Response

```bash
curl -i https://your-worker.workers.dev/api/admin/links?key=wrong-key
# Expected: 429 response with JSON:
# {
#   "error": "Too many failed attempts. Please try again later.",
#   "retryAfter": 3600  // seconds until unblocked
# }
```

### Test 5: Successful Auth Clears Rate Limit

```bash
# Trigger rate limit
for i in {1..11}; do
  curl https://your-worker.workers.dev/api/admin/links?key=wrong-key
done

# Now authenticate successfully
curl https://your-worker.workers.dev/api/admin/links?key=YOUR_ADMIN_KEY
# Expected: 200 OK - rate limit cleared

# Verify it's cleared
curl https://your-worker.workers.dev/api/admin/links?key=wrong-key
# Expected: 401 Unauthorized (not 429)
```

## Monitoring

### Check Rate Limited IPs

Query the database to see blocked IPs:

```bash
wrangler d1 execute go --command "
  SELECT
    ip_address,
    failed_attempts,
    first_attempt_at,
    last_attempt_at,
    blocked_until
  FROM rate_limit
  WHERE blocked_until IS NOT NULL
    AND blocked_until > datetime('now');
"
```

### View All Rate Limit Records

```bash
wrangler d1 execute go --command "SELECT * FROM rate_limit ORDER BY last_attempt_at DESC LIMIT 20;"
```

### Manually Unblock an IP

If you need to manually unblock an IP address:

```bash
wrangler d1 execute go --command "DELETE FROM rate_limit WHERE ip_address = '1.2.3.4';"
```

## Implementation Details

### Flow Diagram

```
┌─────────────────┐
│ Admin Request   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Get Client IP   │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Check Rate Limit    │
│ - Query D1 table    │
│ - Check attempts    │
│ - Check block time  │
└────────┬────────────┘
         │
    ┌────┴────┐
    │  Blocked?│
    └────┬────┘
         │
    ┌────┴────────────┐
    │                 │
   YES               NO
    │                 │
    ▼                 ▼
┌─────────┐    ┌──────────────┐
│ Return  │    │ Check Admin  │
│ 429     │    │ Key          │
└─────────┘    └──────┬───────┘
                      │
                 ┌────┴────┐
                 │  Valid? │
                 └────┬────┘
                      │
                 ┌────┴─────────┐
                 │              │
                YES            NO
                 │              │
                 ▼              ▼
          ┌────────────┐ ┌──────────────┐
          │Clear Rate  │ │Record Failed │
          │Limit       │ │Attempt       │
          └──────┬─────┘ └──────┬───────┘
                 │              │
                 ▼              ▼
          ┌────────────┐ ┌─────────┐
          │Return      │ │Return   │
          │200 OK      │ │401      │
          └────────────┘ └─────────┘
```

### Key Functions

**`checkRateLimit(env, ip)`**
- Returns `{ blocked: false }` if IP is allowed
- Returns `{ blocked: true, retryAfter: seconds }` if IP is blocked
- Handles expired windows and blocks

**`recordFailedAttempt(env, ip)`**
- Creates new record or increments counter
- Resets window if expired
- Does not throw errors (fails gracefully)

**`clearRateLimit(env, ip)`**
- Deletes rate limit record on successful auth
- Called when correct admin key is provided

### Error Handling

- Rate limiting failures do not block authentication (fail-open)
- Database errors are logged but don't prevent requests
- Graceful degradation if D1 is unavailable

## Customization

### Adjust Limits

Edit `wrangler.toml` to change thresholds:

```toml
# Stricter: 5 attempts, 10 min window, 2 hour block
RATE_LIMIT_MAX_ATTEMPTS = "5"
RATE_LIMIT_WINDOW_MINUTES = "10"
RATE_LIMIT_BLOCK_DURATION_MINUTES = "120"

# More lenient: 20 attempts, 30 min window, 30 min block
RATE_LIMIT_MAX_ATTEMPTS = "20"
RATE_LIMIT_WINDOW_MINUTES = "30"
RATE_LIMIT_BLOCK_DURATION_MINUTES = "30"
```

### Cleanup Old Records

Add a scheduled worker to clean up expired records:

```javascript
// In wrangler.toml
[triggers]
crons = ["0 */6 * * *"]  # Every 6 hours

// In worker.js
export default {
  async scheduled(event, env, ctx) {
    // Delete records older than 7 days
    await env.GO_LINKS.prepare(`
      DELETE FROM rate_limit
      WHERE last_attempt_at < datetime('now', '-7 days')
    `).run();
  }
}
```

## Security Considerations

### IP Address Source

Uses `CF-Connecting-IP` header which is:
- ✅ Reliable (set by Cloudflare, cannot be spoofed)
- ✅ Gets real client IP (not Cloudflare proxy IP)
- ✅ Available in all Cloudflare Workers

### Bypass Scenarios

Rate limiting can be bypassed by:
- **Rotating IPs:** Attacker uses many different IP addresses
  - Mitigation: Add CAPTCHA after first few failures
- **Distributed Attack:** Multiple machines attack simultaneously
  - Mitigation: Add global rate limit across all IPs
- **VPN/Proxy Rotation:** Attacker switches VPN servers
  - Mitigation: Require 2FA for admin access

### Privacy

- IP addresses are stored in rate limit table
- Consider anonymization (hash with salt)
- Implement data retention policy (auto-delete after 7 days)

## Troubleshooting

### Rate Limiting Not Working

1. **Check migration applied:**
   ```bash
   wrangler d1 execute go --command "SELECT * FROM rate_limit LIMIT 1;"
   ```

2. **Check environment variables:**
   ```bash
   wrangler tail
   # Look for rate limit configuration in logs
   ```

3. **Check IP detection:**
   ```javascript
   // Add logging to worker.js
   console.log('Client IP:', request.headers.get('CF-Connecting-IP'));
   ```

### Too Strict / Too Lenient

Adjust `RATE_LIMIT_MAX_ATTEMPTS` and `RATE_LIMIT_WINDOW_MINUTES` in `wrangler.toml`.

### False Positives

If legitimate users are getting blocked:
- Increase `RATE_LIMIT_MAX_ATTEMPTS`
- Decrease `RATE_LIMIT_BLOCK_DURATION_MINUTES`
- Manually unblock: `DELETE FROM rate_limit WHERE ip_address = 'X.X.X.X'`

## Next Steps

Consider adding:
1. **CAPTCHA** after 3 failed attempts
2. **Email alerts** when rate limit triggered
3. **Dashboard** to view blocked IPs
4. **Allowlist** for trusted IP ranges
5. **Geographic restrictions** (block specific countries)
6. **Device fingerprinting** for additional security

## References

- [Cloudflare Workers D1 Documentation](https://developers.cloudflare.com/d1/)
- [Rate Limiting Best Practices](https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
