# API Error Codes Reference

This document describes all error codes returned by the Short URL API to help with troubleshooting and debugging.

## Error Response Format

All errors follow this JSON structure:

```json
{
  "error": "Human-readable error message",
  "errorCode": "MACHINE_READABLE_CODE",
  "hint": "Suggestion for how to fix the issue",
  "details": "Additional context (when available)"
}
```

---

## Authentication Errors (401)

### `MISSING_ADMIN_KEY`
**Message:** "Authentication required: Missing admin key"
**Cause:** No admin key provided in request
**Fix:** Add `?key=YOUR_ADMIN_KEY` to the URL or use the Authorization header

**Example:**
```bash
# Wrong
curl https://your-worker.dev/api/admin/links

# Correct
curl https://your-worker.dev/api/admin/links?key=your-key-here
```

---

### `INVALID_ADMIN_KEY`
**Message:** "Authentication failed: Invalid admin key"
**Cause:** The provided admin key doesn't match the configured `ADMIN_KEY`
**Fix:** Check that your admin key is correct (keys are case-sensitive)

**Common Issues:**
- Typo in the key
- Using old/rotated key
- Key copied with extra spaces
- Wrong environment (dev vs production key)

---

## Rate Limiting Errors (429)

### `RATE_LIMIT_EXCEEDED`
**Message:** "Too many failed authentication attempts from IP X.X.X.X. Blocked for N minute(s)."
**Cause:** Exceeded maximum failed login attempts (default: 10 attempts per 15 minutes)
**Fix:** Wait for the block period to expire, or contact an administrator to manually unblock your IP

**Response includes:**
```json
{
  "error": "Rate limit exceeded...",
  "errorCode": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 3600,  // Seconds until unblock
  "hint": "Wait for the block period to expire..."
}
```

**How to unblock:**
```bash
# Admin can manually unblock an IP
wrangler d1 execute go --command "DELETE FROM rate_limit WHERE ip_address = '1.2.3.4';"
```

**Configuration:**
- `RATE_LIMIT_MAX_ATTEMPTS` - Default: 10
- `RATE_LIMIT_WINDOW_MINUTES` - Default: 15
- `RATE_LIMIT_BLOCK_DURATION_MINUTES` - Default: 60

---

## Validation Errors (400)

### `MISSING_FIELDS`
**Message:** "Missing required fields"
**Cause:** Request body missing required fields (shortCode, destinationUrl)
**Fix:** Include all required fields in the request body

**Response includes:**
```json
{
  "error": "Missing required fields",
  "errorCode": "MISSING_FIELDS",
  "missing": ["shortCode", "destinationUrl"],
  "hint": "Request body must include both fields."
}
```

**Example:**
```bash
# Wrong
curl -X POST https://your-worker.dev/api/admin/links?key=KEY \
  -H "Content-Type: application/json" \
  -d '{"shortCode": "test"}'

# Correct
curl -X POST https://your-worker.dev/api/admin/links?key=KEY \
  -H "Content-Type: application/json" \
  -d '{"shortCode": "test", "destinationUrl": "https://example.com"}'
```

---

### `INSECURE_PROTOCOL`
**Message:** "Security: Only HTTPS URLs are allowed. Got protocol: http:"
**Cause:** Attempting to create/update a link with non-HTTPS URL
**Fix:** Change the URL to use HTTPS

**Blocked protocols:**
- `http:` - Use `https:` instead
- `javascript:` - XSS security risk
- `file:` - Local file access
- `data:` - Data URI schemes
- `ftp:`, `mailto:`, etc.

**Example:**
```bash
# Wrong
{"destinationUrl": "http://example.com"}

# Correct
{"destinationUrl": "https://example.com"}
```

---

### `MISSING_HOSTNAME`
**Message:** "Invalid URL: Missing hostname"
**Cause:** URL doesn't have a valid domain name
**Fix:** Include a domain in the URL

**Example:**
```bash
# Wrong
{"destinationUrl": "https:///path"}

# Correct
{"destinationUrl": "https://example.com/path"}
```

---

### `PRIVATE_NETWORK_BLOCKED`
**Message:** "Security: URLs pointing to localhost or private networks are not allowed"
**Cause:** Attempting to create a link to localhost or private IP address (SSRF protection)
**Fix:** Use a public HTTPS URL instead

**Blocked targets:**
- `localhost`
- `127.0.0.1`
- `192.168.x.x` (private network)
- `10.x.x.x` (private network)
- `172.16.x.x` (private network)
- `169.254.x.x` (link-local)
- `[::1]` (IPv6 localhost)

**Example:**
```bash
# Wrong
{"destinationUrl": "https://localhost:3000"}
{"destinationUrl": "https://192.168.1.100"}

# Correct
{"destinationUrl": "https://example.com"}
```

---

### `MALFORMED_URL`
**Message:** "Invalid URL format: [error details]"
**Cause:** URL doesn't conform to valid URL syntax
**Fix:** Ensure the URL is properly formatted

**Common issues:**
- Missing protocol: `example.com` → `https://example.com`
- Invalid characters in domain
- Malformed port number
- Invalid URL encoding

---

## Conflict Errors (409)

### `SHORTCODE_ALREADY_EXISTS`
**Message:** "Conflict: Short code 'X' already exists"
**Cause:** Attempting to create a link with a short code that's already in use
**Fix:** Choose a different short code or update the existing link

**Response includes:**
```json
{
  "error": "Conflict: Short code 'test' already exists",
  "errorCode": "SHORTCODE_ALREADY_EXISTS",
  "conflictingShortCode": "test",
  "existingLinkId": 123,
  "hint": "Choose a different short code or update the existing link instead."
}
```

**Resolution:**
```bash
# Option 1: Use different short code
{"shortCode": "test2", "destinationUrl": "https://example.com"}

# Option 2: Update existing link
curl -X PUT https://your-worker.dev/api/admin/links/123?key=KEY \
  -d '{"shortCode": "test", "destinationUrl": "https://new-url.com"}'
```

---

## Not Found Errors (404)

### `LINK_NOT_FOUND`
**Message:** "Link not found: No link exists with ID X"
**Cause:** Attempting to update/delete a non-existent link
**Fix:** Check that the link ID is correct

**Response includes:**
```json
{
  "error": "Link not found: No link exists with ID 999",
  "errorCode": "LINK_NOT_FOUND",
  "linkId": 999,
  "hint": "Check that the link ID is correct. The link may have been deleted."
}
```

**Troubleshooting:**
```bash
# List all links to find correct ID
curl https://your-worker.dev/api/admin/links?key=KEY

# Check if link was deleted
wrangler d1 execute go --command "SELECT * FROM links WHERE id = 999;"
```

---

### `ENDPOINT_NOT_FOUND`
**Message:** "Endpoint not found"
**Cause:** Requesting a non-existent API endpoint
**Fix:** Check the endpoint path and HTTP method

**Response includes:**
```json
{
  "error": "Endpoint not found",
  "errorCode": "ENDPOINT_NOT_FOUND",
  "path": "/api/admin/invalid",
  "method": "GET",
  "hint": "Valid endpoints: GET /api/admin/links, POST /api/admin/links, ..."
}
```

**Valid endpoints:**
- `GET /api/admin/links` - List links
- `POST /api/admin/links` - Create link
- `PUT /api/admin/links/:id` - Update link
- `DELETE /api/admin/links/:id` - Delete link
- `POST /api/admin/links/:id/reset` - Reset statistics
- `GET /api/admin/analytics` - Get analytics

---

## Database Errors (500)

### `DB_QUERY_FAILED`
**Message:** "Database error: Failed to fetch links"
**Cause:** Database query failed
**Fix:** Check database connection and table existence

**Common causes:**
- D1 database not initialized
- Missing tables (run migrations)
- Database temporarily unavailable
- Network connectivity issues

**Troubleshooting:**
```bash
# Check database exists
wrangler d1 list

# Check tables exist
wrangler d1 execute go --command "SELECT name FROM sqlite_master WHERE type='table';"

# Run migrations
wrangler d1 migrations apply go
```

---

### `DB_INSERT_FAILED`
**Message:** "Database error: Failed to create link"
**Cause:** INSERT operation failed
**Fix:** Check database is accessible and links table exists

**Response includes:**
```json
{
  "error": "Database error: Failed to create link",
  "errorCode": "DB_INSERT_FAILED",
  "details": "SQLITE_CONSTRAINT: UNIQUE constraint failed: links.short_code",
  "hint": "Check that the database is accessible and the links table exists."
}
```

---

### `DB_UPDATE_FAILED`
**Message:** "Database error: Failed to update link"
**Cause:** UPDATE operation failed
**Fix:** Check database is accessible and link exists

**Common causes:**
- Link was deleted by another user
- Database connection lost
- Constraint violation

---

### `DB_DELETE_FAILED`
**Message:** "Database error: Failed to delete link"
**Cause:** DELETE operation failed
**Fix:** Check database is accessible

---

### `DB_RESET_FAILED`
**Message:** "Database error: Failed to reset link statistics"
**Cause:** Failed to reset statistics (update links + delete analytics)
**Fix:** Check database is accessible

---

## Redirect Errors

### `REDIRECT_FAILED`
**HTTP Status:** 500
**Message:** "Service Error\n\nAn error occurred while processing your request."
**Cause:** Error during short URL redirect
**Fix:** Try again later or contact administrator

**Common causes:**
- Database unavailable
- Analytics tracking failed
- Network timeout

**Troubleshooting:**
```bash
# Check worker logs
wrangler tail

# Check database
wrangler d1 execute go --command "SELECT * FROM links LIMIT 1;"
```

---

## Logging

All errors are logged with the following format:

```
[CATEGORY] Message: details, Context: values, Stack: trace
```

**Log categories:**
- `[AUTH]` - Authentication events
- `[RATE_LIMIT]` - Rate limiting events
- `[API]` - API operations (CRUD)
- `[REDIRECT]` - Short URL redirects

**Viewing logs:**
```bash
# Real-time logs
wrangler tail

# Filter by error level
wrangler tail --format=json | grep -i error
```

**Example log entries:**
```
[AUTH] Failed attempt 3/10 from IP 1.2.3.4
[AUTH] Failed attempt 11/10 from IP 1.2.3.4 - RATE LIMIT TRIGGERED
[AUTH] Successful login from IP 1.2.3.4 - rate limit cleared
[API] Created link: test -> https://example.com (ID: 123)
[API] Updated link ID 123: test2 -> https://example.com
[API] Deleted link ID 123
[API] Reset stats for link ID 123: 456 analytics records deleted
[REDIRECT] test -> https://example.com (click #5)
[REDIRECT] Short code not found: invalid
```

---

## Rate Limit Monitoring

### Check blocked IPs
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
    AND blocked_until > datetime('now')
  ORDER BY blocked_until DESC;
"
```

### View all rate limit records
```bash
wrangler d1 execute go --command "
  SELECT * FROM rate_limit
  ORDER BY last_attempt_at DESC
  LIMIT 20;
"
```

### Unblock specific IP
```bash
wrangler d1 execute go --command "
  DELETE FROM rate_limit WHERE ip_address = '1.2.3.4';
"
```

### Clear all rate limits
```bash
wrangler d1 execute go --command "DELETE FROM rate_limit;"
```

---

## Error Code Quick Reference

| Code | Status | Category | Description |
|------|--------|----------|-------------|
| `MISSING_ADMIN_KEY` | 401 | Auth | No admin key provided |
| `INVALID_ADMIN_KEY` | 401 | Auth | Wrong admin key |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate Limit | Too many failed attempts |
| `MISSING_FIELDS` | 400 | Validation | Required fields missing |
| `INSECURE_PROTOCOL` | 400 | Validation | Non-HTTPS URL |
| `MISSING_HOSTNAME` | 400 | Validation | Invalid URL format |
| `PRIVATE_NETWORK_BLOCKED` | 400 | Validation | Localhost/private IP |
| `MALFORMED_URL` | 400 | Validation | Invalid URL syntax |
| `SHORTCODE_ALREADY_EXISTS` | 409 | Conflict | Duplicate short code |
| `LINK_NOT_FOUND` | 404 | Not Found | Link doesn't exist |
| `ENDPOINT_NOT_FOUND` | 404 | Not Found | Invalid API endpoint |
| `DB_QUERY_FAILED` | 500 | Database | Query error |
| `DB_INSERT_FAILED` | 500 | Database | Insert error |
| `DB_UPDATE_FAILED` | 500 | Database | Update error |
| `DB_DELETE_FAILED` | 500 | Database | Delete error |
| `DB_RESET_FAILED` | 500 | Database | Reset stats error |
| `REDIRECT_FAILED` | 500 | Redirect | Redirect processing error |

---

## Getting Help

If you encounter an error not listed here:

1. **Check the logs:**
   ```bash
   wrangler tail
   ```

2. **Verify database:**
   ```bash
   wrangler d1 execute go --command "SELECT 1;"
   ```

3. **Check configuration:**
   ```bash
   cat wrangler.toml
   ```

4. **Report issues:**
   Include error code, full error message, and logs when reporting issues.

---

## Related Documentation

- [Rate Limiting Documentation](./RATE_LIMITING.md)
- [Security Audit](./SECURITY_AUDIT.md)
- [Cloudflare Workers D1 Docs](https://developers.cloudflare.com/d1/)
