# Short URL Service with Admin Panel

A Cloudflare-powered short URL service with D1 database, analytics tracking, and a React admin panel.

**Perfect for self-hosting** - Deploy your own private short URL service without the complexity of traditional cloud infrastructure. No VPCs, no server management, no hidden costs - just click deploy and you're live globally!

## 🚀 One-Click Deploy

Skip the setup entirely! Deploy this complete short URL service in seconds:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/paulstenhouse/short-url-cloudflare)

### What happens when you click Deploy:

✅ **Auto-Clone Repository** - Creates a new repo on your GitHub/GitLab account  
✅ **Provision D1 Database** - Automatically creates and configures the database  
✅ **Deploy Worker** - Builds and deploys your short URL service globally  
✅ **Setup CI/CD** - Every push to main automatically deploys via Workers Builds  
✅ **Preview URLs** - Pull requests get preview deployments for testing  

**No manual setup required!** No need to install Wrangler, create databases, or configure deployments.

### After Deployment:
- **Your Service:** `https://go.[your-account].workers.dev`
- **Admin Panel:** `https://go.[your-account].workers.dev/admin?key=demo-admin-key-12345`

> **Customize After Deployment:**
> - Change `ADMIN_KEY` to a secure key for production use
> - Update `DEFAULT_REDIRECT` to set where the base URL redirects (e.g., your company homepage)

## Features

- **URL Shortening**: Convert long URLs to short, memorable codes
- **Admin Panel**: Protected by URL parameter key authentication
- **Analytics**: Detailed click tracking with geolocation data
- **Pagination & Filtering**: Efficient data browsing with search and filters
- **Modern UI**: Built with React, TypeScript, and shadcn/ui components

## Project Structure

```
├── src/
│   ├── components/           # React components
│   │   ├── AdminAuth.tsx     # Admin authentication
│   │   ├── LinkManager.tsx   # Link CRUD operations
│   │   └── AnalyticsDashboard.tsx # Analytics visualization
│   ├── lib/
│   │   ├── api.ts           # API service layer
│   │   └── utils.ts         # Utility functions
│   ├── types/               # TypeScript type definitions
│   ├── worker.js           # Cloudflare Worker backend
│   └── App.tsx             # Main application
├── migrations/             # D1 database migrations
└── wrangler.toml          # Cloudflare configuration
```

## Manual Setup (Local Development Only)

> **💡 For production deployment, use the [One-Click Deploy](#-one-click-deploy) button above instead!**

The manual setup is only needed if you want to develop locally or customize the code:

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Cloudflare
```bash
# Create a D1 database
npm run db:create

# Apply migrations
npm run db:migrate

# Update wrangler.toml with your database ID and secure admin key
```

### 3. Local Development
```bash
# Start development server
npm run dev

# Deploy when ready
wrangler deploy
```

### vs. Traditional Cloud Setup

**Traditional Cloud Provider:**
- Setup VPC and networking
- Install and configure tools
- Provision and secure databases  
- Configure CI/CD pipelines
- Manage scaling and servers
- Handle security updates

**Cloudflare Deploy Button:**
- ✅ Click button → Everything deployed
- ✅ Serverless and globally distributed
- ✅ Auto-scaling with pay-per-use pricing
- ✅ Built-in CI/CD and security updates
- ✅ No infrastructure management needed

## Usage

### Accessing the Admin Panel

Visit your deployed admin panel:
```
https://your-domain.com/admin?key=your-admin-key
```

Or enter the key manually in the login form.

### API Endpoints

All admin API endpoints require the `key` parameter:

- `GET /api/admin/links?key=KEY` - List links (with pagination/search)
- `POST /api/admin/links?key=KEY` - Create new link
- `PUT /api/admin/links/:id?key=KEY` - Update link
- `DELETE /api/admin/links/:id?key=KEY` - Delete link
- `GET /api/admin/analytics?key=KEY` - View analytics (with filters)

### URL Redirection

Short URLs work immediately:
```
https://your-domain.com/github → redirects to configured URL
```

### Analytics Features

The admin panel tracks:
- Click counts per link
- Visitor IP addresses and geolocation
- User agents and referrers
- Timestamps for all interactions
- Country and city-level analytics

### Pagination & Filtering

Both links and analytics support:
- **Pagination**: Navigate through large datasets
- **Search**: Find links by short code or destination URL
- **Filters**: Filter analytics by date range, country, or specific links
- **Limits**: Configurable page sizes (max 100 for links, 200 for analytics)

## Configuration

### Environment Variables

You can customize your deployment by updating these variables in `wrangler.toml`:

```toml
[vars]
ADMIN_KEY = "your-secure-admin-key"        # Key required to access admin panel
DEFAULT_REDIRECT = "https://your-site.com" # Where the base URL redirects to
```

**Examples:**
- `DEFAULT_REDIRECT = "https://github.com/your-org"` - Redirect to your GitHub org
- `DEFAULT_REDIRECT = "https://your-company.com"` - Redirect to your company homepage  
- `DEFAULT_REDIRECT = "https://linktr.ee/yourname"` - Redirect to your link tree

## Database Setup

### Database Migration

Apply the database schema with a single migration:

```bash
# Apply the complete schema
npx wrangler d1 migrations apply go --remote
```

This runs `migrations/000_initial_schema.sql` which creates all tables, indexes, and constraints in one step.

### Database Schema

The complete schema includes:

**Links Table:**
- URL storage with short codes
- Click tracking and timestamps
- Notes field for context
- Last clicked tracking

**Analytics Table:**
- Comprehensive click analytics
- Cloudflare geo/network data
- Device and browser detection
- Bot detection and filtering

**Key Features:**
- Foreign key constraints for data integrity
- Optimized indexes for performance
- Enhanced analytics with 20+ data points
- Configurable timezone support

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare Pages
npm run deploy

# Access Wrangler CLI
npm run wrangler [command]
```

## Security

- Admin access protected by URL parameter key
- No public API endpoints without authentication
- CORS enabled for admin panel access
- Input validation on all endpoints
- SQL injection protection with prepared statements

## Technologies

- **Frontend**: React, TypeScript, Vite
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Deployment**: Cloudflare Pages + Workers
- **Analytics**: Built-in geolocation via Cloudflare