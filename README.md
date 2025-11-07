# Short URL Service with Admin Panel

A Cloudflare-powered short URL service with D1 database, analytics tracking, and a React admin panel. Built for self-hosting with serverless infrastructure.

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

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Cloudflare account
- Wrangler CLI (installed via npm)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Cloudflare D1 Database
```bash
# Create a new D1 database
npm run db:create

# Apply database migrations
npm run db:migrate
```

### 3. Configure Environment
Update `wrangler.toml` with your settings:
- Update `database_id` with your actual D1 database ID from step 2
- Change `ADMIN_KEY` to a secure key for production
- Update `DEFAULT_REDIRECT` to your preferred default URL

### 4. Local Development
```bash
# Start development server with D1 local database
npm run dev

# Run linting
npm run lint

# Build for production
npm run build
```

### 5. Deploy to Cloudflare
```bash
# Deploy to Cloudflare Pages + Workers
npm run deploy
```

After deployment, your service will be available at:
- **Your Service:** `https://go.[your-account].workers.dev`
- **Admin Panel:** `https://go.[your-account].workers.dev/admin?key=your-admin-key`

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

The application uses Cloudflare D1 (SQLite) as its database. Apply the schema using Wrangler:

```bash
# Apply the complete schema to your D1 database
npm run db:migrate
# or manually: wrangler d1 migrations apply go
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
# Start development server with local D1 database
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare Pages + Workers
npm run deploy

# Run linting
npm run lint

# Preview production build locally
npm run preview

# Access Wrangler CLI directly
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