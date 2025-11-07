# Short URL Service - Setup Complete! 🎉

**Setup Date:** 2025-11-07
**Service Status:** ✅ Active and Ready

## 🔗 Your URLs

### Main Service
```
https://go-3.kardoe.workers.dev
```

### Admin Panel
```
https://go-3.kardoe.workers.dev/admin?key=yj-icm8-tksi
```

### Analytics Page (for any short code)
```
https://go-3.kardoe.workers.dev/analytics/{shortCode}?key=yj-icm8-tksi
```

## 🔐 Admin Credentials

**Admin Key:** 
```
yj-icm8-tksi
```

> ⚠️ **Important:** Save this admin key securely! You'll need it to access the admin panel and API endpoints.

## 🛠 API Endpoints

All admin API endpoints require the `key` parameter with your admin key.

### Links Management

#### List All Links
```bash
curl "https://go-3.kardoe.workers.dev/api/admin/links?key=yj-icm8-tksi"
```

#### Create New Link
```bash
curl -X POST "https://go-3.kardoe.workers.dev/api/admin/links?key=yj-icm8-tksi" \
  -H "Content-Type: application/json" \
  -d '{
    "shortCode": "example",
    "destinationUrl": "https://example.com",
    "notes": "Example link"
  }'
```

#### Update Link
```bash
curl -X PUT "https://go-3.kardoe.workers.dev/api/admin/links/{id}?key=yj-icm8-tksi" \
  -H "Content-Type: application/json" \
  -d '{
    "shortCode": "updated",
    "destinationUrl": "https://updated-example.com",
    "notes": "Updated link"
  }'
```

#### Delete Link
```bash
curl -X DELETE "https://go-3.kardoe.workers.dev/api/admin/links/{id}?key=yj-icm8-tksi"
```

#### Reset Link Statistics
```bash
curl -X POST "https://go-3.kardoe.workers.dev/api/admin/links/{id}/reset?key=yj-icm8-tksi"
```

### Analytics

#### Get Analytics Data
```bash
curl "https://go-3.kardoe.workers.dev/api/admin/analytics?key=yj-icm8-tksi"
```

#### Get Analytics with Filters
```bash
curl "https://go-3.kardoe.workers.dev/api/admin/analytics?key=yj-icm8-tksi&linkId=1&startDate=2024-01-01&endDate=2024-12-31&country=US&limit=100"
```

## 🧪 Test Your Setup

### 1. Test Admin Panel Access
Click this link to access your admin panel:
[https://go-3.kardoe.workers.dev/admin?key=yj-icm8-tksi](https://go-3.kardoe.workers.dev/admin?key=yj-icm8-tksi)

### 2. Create Your First Short Link
1. Go to the admin panel
2. Click "Create New Link"
3. Enter a short code (e.g., "test")
4. Enter a destination URL (e.g., "https://google.com")
5. Click "Create Link"

### 3. Test the Short Link
Visit: `https://go-3.kardoe.workers.dev/test` (replace "test" with your short code)

### 4. View Analytics
Visit: `https://go-3.kardoe.workers.dev/analytics/test?key=yj-icm8-tksi`

## ⚙️ Configuration

Your service is configured with:
- **Default Redirect:** https://stenhouse.org
- **Admin Key:** yj-icm8-tksi
- **Database:** Cloudflare D1 (automatically managed)

To update these settings, edit `wrangler.toml` and redeploy with `npm run deploy`.

## 📖 Usage Examples

### Creating Links Programmatically
```javascript
const response = await fetch('https://go-3.kardoe.workers.dev/api/admin/links?key=yj-icm8-tksi', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    shortCode: 'my-link',
    destinationUrl: 'https://example.com',
    notes: 'Created via API'
  })
});

const link = await response.json();
console.log('Created link:', link);
```

### Getting Analytics Data
```javascript
const response = await fetch('https://go-3.kardoe.workers.dev/api/admin/analytics?key=yj-icm8-tksi');
const analytics = await response.json();
console.log('Analytics:', analytics);
```

## 🌐 Use Your Own Domain (Optional)

You can use your own custom domain instead of the Cloudflare-provided URL.

### Prerequisites
- Domain already added to your Cloudflare account
- Domain DNS managed by Cloudflare

### Steps to Add Custom Domain

1. **Go to Cloudflare Dashboard**
   - Visit [dash.cloudflare.com](https://dash.cloudflare.com/)
   - Select your account

2. **Navigate to Pages**
   - Go to "Workers & Pages" → "Pages"
   - Find your "go" project and click on it

3. **Add Custom Domain**
   - Click the "Custom domains" tab
   - Click "Set up a custom domain"
   - Enter your domain (e.g., `go.yourdomain.com` or `links.yourdomain.com`)
   - Click "Continue"

4. **DNS Configuration**
   - Cloudflare will automatically add the required DNS records
   - If your domain is on Cloudflare, this happens instantly
   - If not, you'll see DNS records to add manually

5. **Wait for Activation**
   - SSL certificate will be automatically provisioned
   - Usually takes 1-5 minutes for activation

### After Adding Custom Domain

Your service will be available at:
- **Custom URL:** `https://go.yourdomain.com`
- **Admin Panel:** `https://go.yourdomain.com/admin?key=yj-icm8-tksi`
- **Short Links:** `https://go.yourdomain.com/yourcode`

### Recommended Domain Patterns
- `go.yourdomain.com` - Simple and clear
- `links.yourdomain.com` - Descriptive
- `s.yourdomain.com` - Very short
- `l.yourdomain.com` - Ultra short

## 🔧 Maintenance

### View Logs
```bash
npx wrangler tail
```

### Update and Redeploy
```bash
npm run build
npm run deploy
```

### Database Operations
```bash
# Apply new migrations
npm run db:migrate

# Access database directly
npx wrangler d1 execute go --command "SELECT * FROM links;"
```

## 🆘 Support

If you encounter issues:
1. Check the [Cloudflare Workers dashboard](https://dash.cloudflare.com/)
2. View logs with `npx wrangler tail`
3. Verify your admin key is correct
4. Ensure your Cloudflare account has sufficient permissions

## 🔒 Security Notes

- Your admin key provides full access to your short URL service
- Keep it secure and don't share it publicly
- Consider rotating it periodically by updating `ADMIN_KEY` in `wrangler.toml`
- All URLs must use HTTPS for security

---

**Generated:** 2025-11-07T20:05:34.813Z
**Service URL:** https://go-3.kardoe.workers.dev
