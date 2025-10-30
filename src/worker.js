export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS for admin panel
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Admin API routes
    if (path.startsWith('/api/admin')) {
      return handleAdminAPI(request, env, url);
    }

    // Health check
    if (path === '/health') {
      return new Response('OK', { status: 200 });
    }

    // Admin interface routes  
    if (path === '/admin') {
      return serveAdminInterface();
    }

    // Link analytics page - /analytics/shortcode?key=adminkey
    if (path.startsWith('/analytics/')) {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

      // Check rate limit
      const rateLimitCheck = await checkRateLimit(env, ip);
      if (rateLimitCheck.blocked) {
        return new Response(
          `Too many failed attempts. Please try again in ${Math.ceil(rateLimitCheck.retryAfter / 60)} minutes.`,
          { status: 429 }
        );
      }

      const shortCode = path.split('/')[2];
      const adminKey = url.searchParams.get('key');

      if (adminKey === env.ADMIN_KEY && shortCode) {
        await clearRateLimit(env, ip);
        return serveLinkAnalytics(shortCode, env);
      }

      // Record failed attempt
      await recordFailedAttempt(env, ip);
      return new Response('Unauthorized', { status: 401 });
    }

    // Default redirect for root
    if (path === '/') {
      return Response.redirect(env.DEFAULT_REDIRECT || 'https://www.example.com', 301);
    }

    // Handle short URL redirect
    return handleRedirect(request, env, url);
  }
};

function serveAdminInterface() {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Short URL Admin</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; }
        .container { max-width: 1200px; margin: 0 auto; padding: 1.5rem; }
        .card { background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 1.5rem; margin-bottom: 1rem; }
        .btn { background: #3b82f6; color: white; padding: 0.5rem 1rem; border-radius: 8px; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; }
        .btn:hover { background: #2563eb; }
        .btn-outline { background: white; color: #6b7280; border: 1px solid #d1d5db; padding: 0.375rem 0.75rem; border-radius: 6px; font-size: 0.875rem; }
        .btn-outline:hover { background: #f9fafb; color: #374151; }
        .btn-small { padding: 0.25rem 0.5rem; font-size: 0.75rem; }
        .input { border: 1px solid #d1d5db; border-radius: 8px; padding: 0.75rem; width: 100%; font-size: 0.875rem; }
        .input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        .table-container { border-radius: 8px; overflow: hidden; }
        .table { width: 100%; border-collapse: collapse; }
        .table th { background: #f8fafc; color: #374151; padding: 0.75rem 1rem; text-align: left; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; }
        .table th:first-child { border-top-left-radius: 12px; }
        .table th:last-child { border-top-right-radius: 12px; }
        .table td { padding: 1rem; border-bottom: 1px solid #f1f5f9; }
        .table tr:last-child td { border-bottom: none; }
        .table tr:last-child td:first-child { border-bottom-left-radius: 12px; }
        .table tr:last-child td:last-child { border-bottom-right-radius: 12px; }
        .table tr:hover { background: #f8fafc; }
        .alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .items-center { align-items: center; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mr-2 { margin-right: 0.5rem; }
        .mt-4 { margin-top: 1rem; }
        .grid { display: grid; }
        .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .gap-3 { gap: 0.75rem; }
        .font-mono { font-family: ui-monospace, SFMono-Regular, monospace; }
        .font-medium { font-weight: 500; }
        .font-semibold { font-weight: 600; }
        .font-bold { font-weight: 700; }
        .text-sm { font-size: 0.875rem; }
        .text-lg { font-size: 1.125rem; }
        .text-xl { font-size: 1.25rem; }
        .text-2xl { font-size: 1.5rem; }
        .text-blue-600 { color: #2563eb; }
        .text-red-600 { color: #dc2626; }
        .text-orange-600 { color: #ea580c; }
        .text-gray-500 { color: #6b7280; }
        .text-gray-600 { color: #4b5563; }
        .text-gray-900 { color: #111827; }
        .hover\:underline:hover { text-decoration: underline; }
        .bg-gray-50 { background-color: #f9fafb; }
        .skeleton { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%); background-size: 400% 100%; animation: skeleton 1.5s ease-in-out infinite; }
        @keyframes skeleton { 0% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .skeleton-row { height: 3.5rem; border-radius: 6px; margin-bottom: 0.5rem; }
        .skeleton-header { height: 2.5rem; border-radius: 6px; margin-bottom: 1rem; }
        small { font-size: 0.75rem; }
    </style>
</head>
<body class="bg-gray-50">
    <div class="container">
        <div id="admin-content">
            <div id="auth-form" class="card">
                <header class="mb-8">
                    <h1 class="text-3xl font-bold text-gray-900">Short URL Manager</h1>
                </header>
                <h2 class="text-lg font-semibold mb-4">Enter Admin Key</h2>
                <form onsubmit="authenticate(event); return false;">
                    <input type="password" id="admin-key" class="input mb-3" placeholder="Admin key" autocomplete="current-password" required>
                    <button type="submit" class="btn">Access Admin</button>
                </form>
            </div>
            <div id="admin-panel" style="display:none;">
                <header class="flex justify-between items-center mb-8">
                    <h1 class="text-3xl font-bold text-gray-900">Short URL Manager</h1>
                    <button onclick="logout()" class="btn btn-outline">Logout</button>
                </header>
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-semibold text-gray-900">Link Management</h2>
                    <button onclick="showCreateForm()" class="btn">Create New Link</button>
                </div>
                <div id="error-container"></div>
                    <div id="create-form" style="display:none; background-color: #f8fafc;" class="card">
                        <h3 class="font-semibold mb-3">Create New Link</h3>
                        <form onsubmit="createLink(); return false;">
                            <div class="mb-4">
                                <input type="text" id="short-code" class="input" placeholder="Auto-generated (edit if needed)" autocomplete="off" required>
                            </div>
                            <div class="mb-4">
                                <input type="url" id="destination-url" class="input" placeholder="Destination URL" autocomplete="url" required>
                            </div>
                            <div class="mb-4">
                                <input type="text" id="notes" class="input" placeholder="Notes" autocomplete="off">
                            </div>
                            <button type="submit" class="btn mr-2">Create & Copy Link</button>
                            <button type="button" onclick="hideCreateForm()" class="btn btn-outline">Cancel</button>
                        </form>
                    </div>
                    <div class="card" style="padding: 0;">
                        <div id="loading-skeleton" style="display:none; padding: 1.5rem;">
                            <div class="skeleton skeleton-header"></div>
                            <div class="skeleton skeleton-row"></div>
                            <div class="skeleton skeleton-row"></div>
                            <div class="skeleton skeleton-row"></div>
                            <div class="skeleton skeleton-row"></div>
                        </div>
                        <div id="table-container" class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Short Code</th>
                                        <th>Destination URL</th>
                                        <th>Notes</th>
                                        <th>Clicks</th>
                                        <th>Last Click</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="links-table">
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div id="pagination" class="mt-4 flex justify-between items-center">
                        <span id="page-info"></span>
                        <div>
                            <button onclick="previousPage()" class="btn btn-outline mr-2">Previous</button>
                            <button onclick="nextPage()" class="btn btn-outline">Next</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let adminKey = '';
        let currentPage = 1;
        let totalPages = 1;

        // Check URL for admin key
        const urlParams = new URLSearchParams(window.location.search);
        const keyFromUrl = urlParams.get('key');
        if (keyFromUrl) {
            adminKey = keyFromUrl;
            showAdminPanel();
            loadLinks();
        }

        function authenticate(event) {
            event.preventDefault();
            const key = document.getElementById('admin-key').value.trim();
            if (key) {
                adminKey = key;
                const url = new URL(window.location);
                url.searchParams.set('key', key);
                window.history.pushState({}, '', url);
                showAdminPanel();
                loadLinks();
            }
        }

        function logout() {
            adminKey = '';
            const url = new URL(window.location);
            url.searchParams.delete('key');
            window.history.pushState({}, '', url);
            showAuthForm();
        }

        function showAuthForm() {
            document.getElementById('auth-form').style.display = 'block';
            document.getElementById('admin-panel').style.display = 'none';
        }

        function showAdminPanel() {
            document.getElementById('auth-form').style.display = 'none';
            document.getElementById('admin-panel').style.display = 'block';
        }

        function showCreateForm() {
            document.getElementById('create-form').style.display = 'block';
            // Auto-generate a 5-digit random ID
            document.getElementById('short-code').value = generateRandomId();
            // Focus on destination input
            setTimeout(() => {
                document.getElementById('destination-url').focus();
            }, 100);
        }

        function generateRandomId() {
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < 5; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        }

        function hideCreateForm() {
            document.getElementById('create-form').style.display = 'none';
            document.getElementById('short-code').value = '';
            document.getElementById('destination-url').value = '';
            document.getElementById('notes').value = '';
        }

        function showError(message) {
            document.getElementById('error-container').innerHTML = 
                '<div class="alert-error">' + message + '</div>';
        }

        function clearError() {
            document.getElementById('error-container').innerHTML = '';
        }

        async function apiRequest(endpoint, options = {}) {
            const url = new URL(endpoint, window.location.origin);
            url.searchParams.set('key', adminKey);
            
            const response = await fetch(url.toString(), {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(error.error || 'Request failed');
            }

            return response.json();
        }

        async function loadLinks() {
            try {
                clearError();
                showLoadingSkeleton();
                const data = await apiRequest('/api/admin/links?page=' + currentPage);
                hideLoadingSkeleton();
                displayLinks(data.links);
                updatePagination(data.pagination);
            } catch (error) {
                hideLoadingSkeleton();
                showError(error.message);
            }
        }
        
        function showLoadingSkeleton() {
            document.getElementById('loading-skeleton').style.display = 'block';
            document.getElementById('table-container').style.display = 'none';
        }
        
        function hideLoadingSkeleton() {
            document.getElementById('loading-skeleton').style.display = 'none';
            document.getElementById('table-container').style.display = 'block';
        }

        function displayLinks(links) {
            const tbody = document.getElementById('links-table');
            const baseUrl = window.location.origin;
            const urlParams = new URLSearchParams(window.location.search);
            const adminKey = urlParams.get('key');
            
            tbody.innerHTML = links.map(link => 
                '<tr>' +
                '<td class="font-mono font-medium">' +
                '<a href="' + baseUrl + '/analytics/' + link.short_code + '?key=' + adminKey + '" target="_blank" class="text-blue-600 hover:underline" title="View analytics">' + 
                link.short_code + '</a>' +
                '</td>' +
                '<td class="text-sm"><a href="' + link.destination_url + '" target="_blank" class="text-gray-900 hover:underline">' + 
                (link.destination_url.length > 50 ? link.destination_url.substring(0, 50) + '...' : link.destination_url) + '</a></td>' +
                '<td class="text-sm text-gray-600">' + (link.notes || '-') + '</td>' +
                '<td class="font-medium text-gray-900">' + link.click_count + '</td>' +
                '<td class="text-sm text-gray-600">' + (link.last_clicked ? new Date(link.last_clicked).toLocaleDateString() : 'Never') + '</td>' +
                '<td class="text-sm text-gray-600">' + new Date(link.created_at).toLocaleDateString() + '</td>' +
                '<td>' +
                '<a href="' + baseUrl + '/' + link.short_code + '" target="_blank" class="btn btn-outline btn-small mr-2" title="Test redirect">Test</a>' +
                '<button onclick="resetLinkStats(' + link.id + ')" class="btn btn-outline btn-small mr-2 text-orange-600" title="Reset statistics">Reset</button>' +
                '<button onclick="deleteLink(' + link.id + ')" class="btn btn-outline btn-small text-red-600">Delete</button>' +
                '</td>' +
                '</tr>'
            ).join('');
        }

        function updatePagination(pagination) {
            currentPage = pagination.page;
            totalPages = pagination.pages;
            document.getElementById('page-info').textContent = 
                'Page ' + pagination.page + ' of ' + pagination.pages;
        }

        async function createLink() {
            const shortCode = document.getElementById('short-code').value;
            const destinationUrl = document.getElementById('destination-url').value;
            const notes = document.getElementById('notes').value;
            
            if (!shortCode || !destinationUrl) {
                showError('Please fill in both fields');
                return;
            }

            try {
                await apiRequest('/api/admin/links', {
                    method: 'POST',
                    body: JSON.stringify({ shortCode, destinationUrl, notes })
                });
                
                // Copy link to clipboard
                const fullUrl = window.location.origin + '/' + shortCode;
                try {
                    await navigator.clipboard.writeText(fullUrl);
                    // Show success message with copy confirmation
                    showError('Link created and copied to clipboard: ' + fullUrl);
                    document.querySelector('.alert-error').style.background = '#f0f9ff';
                    document.querySelector('.alert-error').style.borderColor = '#0ea5e9';
                    document.querySelector('.alert-error').style.color = '#0369a1';
                } catch (clipboardError) {
                    showError('Link created: ' + fullUrl + ' (Could not copy to clipboard)');
                }
                
                hideCreateForm();
                loadLinks();
            } catch (error) {
                showError(error.message);
            }
        }

        async function deleteLink(id) {
            if (confirm('Are you sure?')) {
                try {
                    await apiRequest('/api/admin/links/' + id, { method: 'DELETE' });
                    loadLinks();
                } catch (error) {
                    showError(error.message);
                }
            }
        }

        async function resetLinkStats(id) {
            const message = 'Are you sure you want to reset all statistics for this link? This will:' +
                '\\n\\n• Reset click count to 0' +
                '\\n• Clear last clicked date' +
                '\\n• Delete all analytics logs' +
                '\\n\\nThis action cannot be undone.';
            
            if (confirm(message)) {
                try {
                    await apiRequest('/api/admin/links/' + id + '/reset', { method: 'POST' });
                    loadLinks();
                    // Show success message
                    showError('Link statistics reset successfully');
                    document.querySelector('.alert-error').style.background = '#f0f9ff';
                    document.querySelector('.alert-error').style.borderColor = '#0ea5e9';
                    document.querySelector('.alert-error').style.color = '#0369a1';
                } catch (error) {
                    showError(error.message);
                }
            }
        }

        function previousPage() {
            if (currentPage > 1) {
                currentPage--;
                loadLinks();
            }
        }

        function nextPage() {
            if (currentPage < totalPages) {
                currentPage++;
                loadLinks();
            }
        }
    </script>
</body>
</html>
`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}

async function serveLinkAnalytics(shortCode, env) {
  try {
    // Get link details
    const link = await env.GO_LINKS.prepare(
      'SELECT * FROM links WHERE short_code = ?1'
    ).bind(shortCode).first();

    if (!link) {
      return new Response('Link not found', { status: 404 });
    }

    // Get analytics for this link
    const analytics = await env.GO_LINKS.prepare(`
      SELECT * FROM analytics WHERE link_id = ?1 ORDER BY timestamp DESC LIMIT 100
    `).bind(link.id).all();

    // Get stats
    const stats = await env.GO_LINKS.prepare(`
      SELECT 
        COUNT(*) as total_clicks,
        COUNT(DISTINCT ip_address) as unique_visitors,
        COUNT(DISTINCT country) as countries,
        country,
        COUNT(*) as country_count
      FROM analytics 
      WHERE link_id = ?1
      GROUP BY country
      ORDER BY country_count DESC
    `).bind(link.id).all();

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analytics for ${shortCode}</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 2rem; background: #f9fafb; }
        .container { max-width: 1200px; margin: 0 auto; }
        .card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.5rem; margin-bottom: 1rem; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .stat { background: #f8fafc; padding: 1rem; border-radius: 6px; text-align: center; }
        .stat-number { font-size: 2rem; font-weight: bold; color: #1f2937; }
        .stat-label { color: #6b7280; font-size: 0.875rem; }
        .table { width: 100%; border-collapse: collapse; }
        .table th, .table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .table th { background: #f9fafb; font-weight: 600; }
        .btn { background: #3b82f6; color: white; padding: 0.5rem 1rem; border-radius: 6px; text-decoration: none; }
        .font-mono { font-family: ui-monospace, SFMono-Regular, monospace; }
        .text-blue-600 { color: #2563eb; }
        .text-sm { font-size: 0.875rem; }
        .text-gray-500 { color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h1>Analytics for <span class="font-mono text-blue-600">${shortCode}</span></h1>
                <p class="text-gray-500">Destination: <a href="${link.destination_url}" target="_blank" class="text-blue-600">${link.destination_url}</a></p>
            </div>
            <a href="/admin?key=${env.ADMIN_KEY}" class="btn">← Back to Admin</a>
        </div>

        <div class="stats">
            <div class="stat">
                <div class="stat-number">${link.click_count}</div>
                <div class="stat-label">Total Clicks</div>
            </div>
            <div class="stat">
                <div class="stat-number">${analytics.results.filter((a, i, arr) => arr.findIndex(b => b.ip_address === a.ip_address) === i).length}</div>
                <div class="stat-label">Unique Visitors</div>
            </div>
            <div class="stat">
                <div class="stat-number">${[...new Set(analytics.results.map(a => a.country).filter(Boolean))].length}</div>
                <div class="stat-label">Countries</div>
            </div>
            <div class="stat">
                <div class="stat-number">${analytics.results.filter(a => a.timestamp > new Date(Date.now() - 24*60*60*1000).toISOString()).length}</div>
                <div class="stat-label">Last 24h</div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
            <div>
                <h3 class="text-xl font-semibold text-gray-900 mb-4">Top Countries</h3>
                <div class="card" style="padding: 0;">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr><th>Country</th><th>Clicks</th></tr>
                            </thead>
                            <tbody>
                                ${[...analytics.results.reduce((acc, entry) => {
                                  if (entry.country) {
                                    acc.set(entry.country, (acc.get(entry.country) || 0) + 1);
                                  }
                                  return acc;
                                }, new Map())]
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 10)
                                .map(([country, count]) => `<tr><td>${country || 'Unknown'}</td><td>${count}</td></tr>`)
                                .join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div>
                <h3 class="text-xl font-semibold text-gray-900 mb-4">Device Types</h3>
                <div class="card" style="padding: 0;">
                    <div class="table-container">
                        <table class="table">
                        <thead>
                            <tr><th>Device</th><th>Clicks</th></tr>
                        </thead>
                        <tbody>
                            ${[...analytics.results.reduce((acc, entry) => {
                              const device = entry.device_type || 'unknown';
                              acc.set(device, (acc.get(device) || 0) + 1);
                              return acc;
                            }, new Map())]
                            .sort((a, b) => b[1] - a[1])
                            .map(([device, count]) => `<tr><td style="text-transform:capitalize">${device}</td><td>${count}</td></tr>`)
                            .join('')}
                        </tbody>
                    </table>
                    </div>
                </div>
            </div>

            <div>
                <h3 class="text-xl font-semibold text-gray-900 mb-4">Top Referrers</h3>
                <div class="card" style="padding: 0;">
                    <div class="table-container">
                        <table class="table">
                        <thead>
                            <tr><th>Source</th><th>Clicks</th></tr>
                        </thead>
                        <tbody>
                            ${[...analytics.results.reduce((acc, entry) => {
                              const source = entry.referer ? new URL(entry.referer).hostname : 'Direct';
                              acc.set(source, (acc.get(source) || 0) + 1);
                              return acc;
                            }, new Map())]
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 10)
                            .map(([source, count]) => `<tr><td>${source}</td><td>${count}</td></tr>`)
                            .join('')}
                        </tbody>
                    </table>
                    </div>
                </div>
            </div>
        </div>

        <div>
            <h3 class="text-xl font-semibold text-gray-900 mb-4">Recent Clicks</h3>
            <div class="card" style="padding: 0;">
                <div class="table-container" style="overflow-x: auto;">
                    <table class="table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Location</th>
                            <th>Device</th>
                            <th>Network</th>
                            <th>Protocol</th>
                            <th>Referrer</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${analytics.results.slice(0, 50).map(entry => `
                            <tr>
                                <td class="text-sm">
                                    <span class="timestamp" data-timestamp="${entry.timestamp}"></span>
                                    <br><small class="text-gray-500 timezone"></small>
                                </td>
                                <td class="text-sm">
                                    ${entry.country || 'Unknown'}${entry.region ? `, ${entry.region}` : ''}
                                    ${entry.city ? `<br><small class="text-gray-500">${entry.city}</small>` : ''}
                                </td>
                                <td class="text-sm">
                                    <span style="text-transform:capitalize">${entry.device_type || 'unknown'}</span>
                                    ${entry.http_protocol ? `<br><small class="text-gray-500">${entry.http_protocol}</small>` : ''}
                                </td>
                                <td class="text-sm">
                                    ${entry.as_organization ? entry.as_organization.substring(0, 20) + (entry.as_organization.length > 20 ? '...' : '') : '-'}
                                    ${entry.colo ? `<br><small class="text-gray-500">DC: ${entry.colo}</small>` : ''}
                                </td>
                                <td class="text-sm">
                                    ${entry.tls_version || '-'}
                                    ${entry.client_tcp_rtt ? `<br><small class="text-gray-500">${entry.client_tcp_rtt}ms RTT</small>` : ''}
                                </td>
                                <td class="text-sm">
                                    ${entry.referer ? 
                                      `<a href="${entry.referer}" target="_blank" class="text-blue-600">${new URL(entry.referer).hostname}</a>` : 
                                      'Direct'
                                    }
                                    ${entry.bot_category ? `<br><small class="text-gray-500">Bot: ${entry.bot_category}</small>` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // Format timestamps to local time
        document.querySelectorAll('.timestamp').forEach(span => {
            const timestamp = span.getAttribute('data-timestamp');
            if (timestamp) {
                const date = new Date(timestamp);
                span.textContent = date.toLocaleString(undefined, {
                    year: 'numeric',
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                // Add timezone info
                const timezoneSpan = span.parentElement.querySelector('.timezone');
                if (timezoneSpan) {
                    const timezone = date.toLocaleString(undefined, {
                        timeZoneName: 'short'
                    }).split(' ').pop();
                    timezoneSpan.textContent = timezone;
                }
            }
        });
    </script>
</body>
</html>
`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    return new Response('Error loading analytics: ' + error.message, { status: 500 });
  }
}

// Rate limiting functions
async function checkRateLimit(env, ip) {
  try {
    const maxAttempts = parseInt(env.RATE_LIMIT_MAX_ATTEMPTS || '10');
    const windowMinutes = parseInt(env.RATE_LIMIT_WINDOW_MINUTES || '15');
    const blockDurationMinutes = parseInt(env.RATE_LIMIT_BLOCK_DURATION_MINUTES || '60');

    // Get rate limit record for this IP
    const record = await env.GO_LINKS.prepare(
      'SELECT * FROM rate_limit WHERE ip_address = ?1'
    ).bind(ip).first();

    if (!record) {
      return { blocked: false };
    }

    const now = new Date();

    // Check if IP is currently blocked
    if (record.blocked_until) {
      const blockedUntil = new Date(record.blocked_until);
      if (now < blockedUntil) {
        const retryAfter = Math.ceil((blockedUntil - now) / 1000); // seconds
        const minutesLeft = Math.ceil(retryAfter / 60);
        return {
          blocked: true,
          retryAfter,
          message: `Too many failed authentication attempts from IP ${ip}. Blocked for ${minutesLeft} more minute(s). Please try again at ${blockedUntil.toISOString()}.`
        };
      }
    }

    // Check if we're within the rate limit window
    const firstAttempt = new Date(record.first_attempt_at);
    const windowEnd = new Date(firstAttempt.getTime() + windowMinutes * 60 * 1000);

    // If window has expired, allow the request (will be reset on next attempt)
    if (now > windowEnd) {
      return { blocked: false };
    }

    // Check if exceeded max attempts within window
    if (record.failed_attempts >= maxAttempts) {
      // Block the IP
      const blockUntil = new Date(now.getTime() + blockDurationMinutes * 60 * 1000);
      await env.GO_LINKS.prepare(
        'UPDATE rate_limit SET blocked_until = ?1 WHERE ip_address = ?2'
      ).bind(blockUntil.toISOString(), ip).run();

      const retryAfter = blockDurationMinutes * 60;
      return {
        blocked: true,
        retryAfter,
        message: `Rate limit exceeded: ${record.failed_attempts} failed attempts within ${windowMinutes} minutes. IP ${ip} is now blocked for ${blockDurationMinutes} minutes. Try again at ${blockUntil.toISOString()}.`
      };
    }

    return { blocked: false };
  } catch (error) {
    console.error('Rate limit check failed:', error.message, 'IP:', ip);
    // Fail open - allow request if rate limiting fails
    return { blocked: false };
  }
}

async function recordFailedAttempt(env, ip) {
  try {
    const windowMinutes = parseInt(env.RATE_LIMIT_WINDOW_MINUTES || '15');
    const maxAttempts = parseInt(env.RATE_LIMIT_MAX_ATTEMPTS || '10');
    const now = new Date().toISOString();

    // Get existing record
    const record = await env.GO_LINKS.prepare(
      'SELECT * FROM rate_limit WHERE ip_address = ?1'
    ).bind(ip).first();

    if (!record) {
      // Create new record
      await env.GO_LINKS.prepare(`
        INSERT INTO rate_limit (ip_address, failed_attempts, first_attempt_at, last_attempt_at)
        VALUES (?1, 1, ?2, ?2)
      `).bind(ip, now).run();
      console.warn(`[AUTH] Failed attempt 1/${maxAttempts} from IP ${ip}`);
    } else {
      const firstAttempt = new Date(record.first_attempt_at);
      const windowEnd = new Date(firstAttempt.getTime() + windowMinutes * 60 * 1000);
      const currentTime = new Date();

      if (currentTime > windowEnd) {
        // Window expired, reset the counter
        await env.GO_LINKS.prepare(`
          UPDATE rate_limit
          SET failed_attempts = 1, first_attempt_at = ?1, last_attempt_at = ?1, blocked_until = NULL
          WHERE ip_address = ?2
        `).bind(now, ip).run();
        console.warn(`[AUTH] Failed attempt 1/${maxAttempts} from IP ${ip} (window reset)`);
      } else {
        // Increment counter within window
        const newAttempts = record.failed_attempts + 1;
        await env.GO_LINKS.prepare(`
          UPDATE rate_limit
          SET failed_attempts = failed_attempts + 1, last_attempt_at = ?1
          WHERE ip_address = ?2
        `).bind(now, ip).run();
        console.warn(`[AUTH] Failed attempt ${newAttempts}/${maxAttempts} from IP ${ip}${newAttempts >= maxAttempts ? ' - RATE LIMIT TRIGGERED' : ''}`);
      }
    }
  } catch (error) {
    console.error('[RATE_LIMIT] Failed to record attempt:', error.message, 'IP:', ip, 'Stack:', error.stack);
    // Don't throw - rate limiting failure shouldn't break auth
  }
}

async function clearRateLimit(env, ip) {
  try {
    // Clear rate limit record on successful authentication
    const result = await env.GO_LINKS.prepare(
      'DELETE FROM rate_limit WHERE ip_address = ?1'
    ).bind(ip).run();
    if (result.meta.changes > 0) {
      console.log(`[AUTH] Successful login from IP ${ip} - rate limit cleared`);
    }
  } catch (error) {
    console.error('[RATE_LIMIT] Failed to clear rate limit:', error.message, 'IP:', ip);
    // Don't throw - this is a cleanup operation
  }
}

async function handleAdminAPI(request, env, url) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const path = url.pathname;

  // Check if IP is rate limited
  const rateLimitCheck = await checkRateLimit(env, ip);
  if (rateLimitCheck.blocked) {
    return jsonResponse({
      error: rateLimitCheck.message || 'Too many failed attempts. Please try again later.',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      retryAfter: rateLimitCheck.retryAfter,
      hint: 'Wait for the block period to expire, or contact an administrator to manually unblock your IP.'
    }, 429);
  }

  const adminKey = url.searchParams.get('key');

  if (!adminKey) {
    return jsonResponse({
      error: 'Authentication required: Missing admin key',
      errorCode: 'MISSING_ADMIN_KEY',
      hint: 'Add ?key=YOUR_ADMIN_KEY to the URL or use the Authorization header.'
    }, 401);
  }

  if (adminKey !== env.ADMIN_KEY) {
    // Record failed authentication attempt
    await recordFailedAttempt(env, ip);
    return jsonResponse({
      error: 'Authentication failed: Invalid admin key',
      errorCode: 'INVALID_ADMIN_KEY',
      hint: 'Check that your admin key is correct. Keys are case-sensitive.'
    }, 401);
  }

  // Successful authentication - clear rate limit
  await clearRateLimit(env, ip);

  const method = request.method;

  if (path === '/api/admin/links') {
    if (method === 'GET') {
      return getLinks(request, env, url);
    } else if (method === 'POST') {
      return createLink(request, env);
    }
  }

  if (path.match(/\/api\/admin\/links\/\d+\/reset/)) {
    const linkId = path.split('/')[4]; // /api/admin/links/{id}/reset
    if (method === 'POST') {
      return resetLinkStats(env, linkId);
    }
  }

  if (path.match(/\/api\/admin\/links\/\d+/)) {
    const linkId = path.split('/').pop();
    if (method === 'PUT') {
      return updateLink(request, env, linkId);
    } else if (method === 'DELETE') {
      return deleteLink(env, linkId);
    }
  }

  if (path === '/api/admin/analytics') {
    return getAnalytics(request, env, url);
  }

  return jsonResponse({
    error: 'Endpoint not found',
    errorCode: 'ENDPOINT_NOT_FOUND',
    path: path,
    method: method,
    hint: 'Valid endpoints: GET /api/admin/links, POST /api/admin/links, PUT /api/admin/links/:id, DELETE /api/admin/links/:id, POST /api/admin/links/:id/reset, GET /api/admin/analytics'
  }, 404);
}

async function getLinks(request, env, url) {
  try {
    // Pagination parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    // Filter parameters
    const search = url.searchParams.get('search');
    
    let query = 'SELECT * FROM links';
    let countQuery = 'SELECT COUNT(*) as total FROM links';
    let params = [];
    let countParams = [];

    // Add search filter
    if (search) {
      const searchCondition = ' WHERE short_code LIKE ?1 OR destination_url LIKE ?1';
      query += searchCondition;
      countQuery += searchCondition;
      const searchParam = `%${search}%`;
      params.push(searchParam);
      countParams.push(searchParam);
    }

    // Add ordering and pagination
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    if (offset > 0) {
      query += ' OFFSET ?';
      params.push(offset);
    }

    const [linksResult, countResult] = await Promise.all([
      env.GO_LINKS.prepare(query).bind(...params).all(),
      env.GO_LINKS.prepare(countQuery).bind(...countParams).first()
    ]);

    return jsonResponse({
      links: linksResult.results,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('[API] Failed to fetch links:', error.message, 'Stack:', error.stack);
    return jsonResponse({
      error: 'Database error: Failed to fetch links',
      errorCode: 'DB_QUERY_FAILED',
      details: error.message,
      hint: 'Check that the database is accessible and the links table exists.'
    }, 500);
  }
}

function validateDestinationUrl(url) {
  try {
    const parsed = new URL(url);

    // Only allow HTTPS protocol (not HTTP, javascript:, file:, data:, etc.)
    if (parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: `Security: Only HTTPS URLs are allowed. Got protocol: ${parsed.protocol}`,
        errorCode: 'INSECURE_PROTOCOL',
        hint: 'Change the URL to use HTTPS (https://) instead of ' + parsed.protocol
      };
    }

    // Additional validation: Check for valid hostname
    if (!parsed.hostname || parsed.hostname.length === 0) {
      return {
        valid: false,
        error: 'Invalid URL: Missing hostname',
        errorCode: 'MISSING_HOSTNAME',
        hint: 'URL must include a domain name (e.g., https://example.com/path)'
      };
    }

    // Reject localhost and private IP ranges for security
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('169.254.') ||
      hostname === '[::1]'
    ) {
      return {
        valid: false,
        error: `Security: URLs pointing to localhost or private networks are not allowed (${hostname})`,
        errorCode: 'PRIVATE_NETWORK_BLOCKED',
        hint: 'Use a public HTTPS URL instead of localhost or private IP addresses.'
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid URL format: ${error.message}`,
      errorCode: 'MALFORMED_URL',
      hint: 'Ensure the URL is properly formatted (e.g., https://example.com/page)'
    };
  }
}

async function createLink(request, env) {
  try {
    const { shortCode, destinationUrl, notes } = await request.json();

    if (!shortCode || !destinationUrl) {
      return jsonResponse({
        error: 'Missing required fields',
        errorCode: 'MISSING_FIELDS',
        missing: [
          !shortCode ? 'shortCode' : null,
          !destinationUrl ? 'destinationUrl' : null
        ].filter(Boolean),
        hint: 'Request body must include both "shortCode" and "destinationUrl" fields.'
      }, 400);
    }

    // Validate destination URL (HTTPS only)
    const urlValidation = validateDestinationUrl(destinationUrl);
    if (!urlValidation.valid) {
      return jsonResponse({
        error: urlValidation.error,
        errorCode: urlValidation.errorCode,
        hint: urlValidation.hint,
        providedUrl: destinationUrl
      }, 400);
    }

    // Check if short code already exists
    const existing = await env.GO_LINKS.prepare('SELECT id FROM links WHERE short_code = ?1')
      .bind(shortCode)
      .first();

    if (existing) {
      return jsonResponse({
        error: `Conflict: Short code "${shortCode}" already exists`,
        errorCode: 'SHORTCODE_ALREADY_EXISTS',
        conflictingShortCode: shortCode,
        existingLinkId: existing.id,
        hint: 'Choose a different short code or update the existing link instead.'
      }, 409);
    }

    const result = await env.GO_LINKS.prepare(
      'INSERT INTO links (short_code, destination_url, notes) VALUES (?1, ?2, ?3)'
    ).bind(shortCode, destinationUrl, notes || null).run();

    console.log(`[API] Created link: ${shortCode} -> ${destinationUrl} (ID: ${result.meta.last_row_id})`);

    return jsonResponse({
      id: result.meta.last_row_id,
      shortCode,
      destinationUrl,
      notes,
      message: 'Link created successfully',
      url: `/${shortCode}`
    });
  } catch (error) {
    console.error('[API] Failed to create link:', error.message, 'Stack:', error.stack);
    return jsonResponse({
      error: 'Database error: Failed to create link',
      errorCode: 'DB_INSERT_FAILED',
      details: error.message,
      hint: 'Check that the database is accessible and the links table exists.'
    }, 500);
  }
}

async function updateLink(request, env, linkId) {
  try {
    const { shortCode, destinationUrl } = await request.json();

    if (!shortCode || !destinationUrl) {
      return jsonResponse({
        error: 'Missing required fields',
        errorCode: 'MISSING_FIELDS',
        missing: [
          !shortCode ? 'shortCode' : null,
          !destinationUrl ? 'destinationUrl' : null
        ].filter(Boolean),
        hint: 'Request body must include both "shortCode" and "destinationUrl" fields.'
      }, 400);
    }

    // Validate destination URL (HTTPS only)
    const urlValidation = validateDestinationUrl(destinationUrl);
    if (!urlValidation.valid) {
      return jsonResponse({
        error: urlValidation.error,
        errorCode: urlValidation.errorCode,
        hint: urlValidation.hint,
        providedUrl: destinationUrl
      }, 400);
    }

    // Check if short code exists for another link
    const existing = await env.GO_LINKS.prepare(
      'SELECT id FROM links WHERE short_code = ?1 AND id != ?2'
    ).bind(shortCode, linkId).first();

    if (existing) {
      return jsonResponse({
        error: `Conflict: Short code "${shortCode}" is already used by another link`,
        errorCode: 'SHORTCODE_ALREADY_EXISTS',
        conflictingShortCode: shortCode,
        existingLinkId: existing.id,
        currentLinkId: parseInt(linkId),
        hint: 'Choose a different short code for this link.'
      }, 409);
    }

    const result = await env.GO_LINKS.prepare(
      'UPDATE links SET short_code = ?1, destination_url = ?2 WHERE id = ?3'
    ).bind(shortCode, destinationUrl, linkId).run();

    if (result.meta.changes === 0) {
      return jsonResponse({
        error: `Link not found: No link exists with ID ${linkId}`,
        errorCode: 'LINK_NOT_FOUND',
        linkId: parseInt(linkId),
        hint: 'Check that the link ID is correct. The link may have been deleted.'
      }, 404);
    }

    console.log(`[API] Updated link ID ${linkId}: ${shortCode} -> ${destinationUrl}`);

    return jsonResponse({
      message: 'Link updated successfully',
      id: parseInt(linkId),
      shortCode,
      destinationUrl
    });
  } catch (error) {
    console.error('[API] Failed to update link:', error.message, 'LinkID:', linkId, 'Stack:', error.stack);
    return jsonResponse({
      error: 'Database error: Failed to update link',
      errorCode: 'DB_UPDATE_FAILED',
      details: error.message,
      linkId: parseInt(linkId),
      hint: 'Check that the database is accessible and the link exists.'
    }, 500);
  }
}

async function deleteLink(env, linkId) {
  try {
    const result = await env.GO_LINKS.prepare('DELETE FROM links WHERE id = ?1').bind(linkId).run();

    if (result.meta.changes === 0) {
      return jsonResponse({
        error: `Link not found: No link exists with ID ${linkId}`,
        errorCode: 'LINK_NOT_FOUND',
        linkId: parseInt(linkId),
        hint: 'Check that the link ID is correct. The link may already be deleted.'
      }, 404);
    }

    console.log(`[API] Deleted link ID ${linkId}`);

    return jsonResponse({
      message: 'Link deleted successfully',
      id: parseInt(linkId)
    });
  } catch (error) {
    console.error('[API] Failed to delete link:', error.message, 'LinkID:', linkId, 'Stack:', error.stack);
    return jsonResponse({
      error: 'Database error: Failed to delete link',
      errorCode: 'DB_DELETE_FAILED',
      details: error.message,
      linkId: parseInt(linkId),
      hint: 'Check that the database is accessible.'
    }, 500);
  }
}

async function resetLinkStats(env, linkId) {
  try {
    // Reset click count and last clicked in links table
    const linkResult = await env.GO_LINKS.prepare(
      'UPDATE links SET click_count = 0, last_clicked = NULL WHERE id = ?1'
    ).bind(linkId).run();

    if (linkResult.meta.changes === 0) {
      return jsonResponse({
        error: `Link not found: No link exists with ID ${linkId}`,
        errorCode: 'LINK_NOT_FOUND',
        linkId: parseInt(linkId),
        hint: 'Check that the link ID is correct. The link may have been deleted.'
      }, 404);
    }

    // Delete all analytics records for this link
    const analyticsResult = await env.GO_LINKS.prepare(
      'DELETE FROM analytics WHERE link_id = ?1'
    ).bind(linkId).run();

    console.log(`[API] Reset stats for link ID ${linkId}: ${analyticsResult.meta.changes} analytics records deleted`);

    return jsonResponse({
      message: 'Link statistics reset successfully',
      id: parseInt(linkId),
      analyticsRecordsDeleted: analyticsResult.meta.changes
    });
  } catch (error) {
    console.error('[API] Failed to reset link stats:', error.message, 'LinkID:', linkId, 'Stack:', error.stack);
    return jsonResponse({
      error: 'Database error: Failed to reset link statistics',
      errorCode: 'DB_RESET_FAILED',
      details: error.message,
      linkId: parseInt(linkId),
      hint: 'Check that the database is accessible and the link exists.'
    }, 500);
  }
}

async function getAnalytics(request, env, url) {
  try {
    // Pagination parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = (page - 1) * limit;

    // Filter parameters
    const linkId = url.searchParams.get('linkId');
    const country = url.searchParams.get('country');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');

    let query = `
      SELECT a.*, l.short_code, l.destination_url 
      FROM analytics a 
      JOIN links l ON a.link_id = l.id
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM analytics a JOIN links l ON a.link_id = l.id';
    let conditions = [];
    let params = [];
    let countParams = [];

    // Add filters
    if (linkId) {
      conditions.push('a.link_id = ?');
      params.push(linkId);
      countParams.push(linkId);
    }

    if (country) {
      conditions.push('a.country = ?');
      params.push(country);
      countParams.push(country);
    }

    if (dateFrom) {
      conditions.push('a.timestamp >= ?');
      params.push(dateFrom);
      countParams.push(dateFrom);
    }

    if (dateTo) {
      conditions.push('a.timestamp <= ?');
      params.push(dateTo);
      countParams.push(dateTo);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    // Add ordering and pagination
    query += ' ORDER BY a.timestamp DESC LIMIT ?';
    params.push(limit);
    
    if (offset > 0) {
      query += ' OFFSET ?';
      params.push(offset);
    }

    const [analyticsResult, countResult] = await Promise.all([
      env.GO_LINKS.prepare(query).bind(...params).all(),
      env.GO_LINKS.prepare(countQuery).bind(...countParams).first()
    ]);

    return jsonResponse({
      analytics: analyticsResult.results,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      },
      filters: {
        linkId: linkId || null,
        country: country || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null
      }
    });
  } catch (error) {
    console.error('[API] Failed to fetch analytics:', error.message, 'Stack:', error.stack);
    return jsonResponse({
      error: 'Database error: Failed to fetch analytics',
      errorCode: 'DB_QUERY_FAILED',
      details: error.message,
      hint: 'Check that the database is accessible and the analytics table exists.'
    }, 500);
  }
}

async function handleRedirect(request, env, url) {
  const shortCode = url.pathname.slice(1);

  if (!shortCode) {
    return Response.redirect(env.DEFAULT_REDIRECT || 'https://www.example.com', 301);
  }

  try {
    // Get the link from database
    const link = await env.GO_LINKS.prepare(
      'SELECT * FROM links WHERE short_code = ?1'
    ).bind(shortCode).first();

    if (!link) {
      console.warn(`[REDIRECT] Short code not found: ${shortCode}`);
      return new Response(
        `Short link not found: /${shortCode}\n\nThis short link does not exist. Please check the URL and try again.`,
        {
          status: 404,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }
      );
    }

    // Track analytics and increment click count
    await Promise.all([
      trackAnalytics(request, env, link),
      env.GO_LINKS.prepare(
        'UPDATE links SET click_count = click_count + 1, last_clicked = CURRENT_TIMESTAMP WHERE id = ?1'
      ).bind(link.id).run()
    ]);

    // Only append query params if destination URL doesn't already have any
    const hasDestinationParams = link.destination_url.includes('?');
    const finalUrl = hasDestinationParams ? link.destination_url : link.destination_url + url.search;

    console.log(`[REDIRECT] ${shortCode} -> ${link.destination_url} (click #${link.click_count + 1})`);

    return Response.redirect(finalUrl, 301);
  } catch (error) {
    console.error('[REDIRECT] Error processing redirect:', error.message, 'ShortCode:', shortCode, 'Stack:', error.stack);
    return new Response(
      `Service Error\n\nAn error occurred while processing your request. Please try again later.\n\nError Code: REDIRECT_FAILED`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      }
    );
  }
}

async function trackAnalytics(request, env, link) {
  try {
    const cf = request.cf || {};
    const userAgent = request.headers.get('User-Agent') || '';
    const referer = request.headers.get('Referer') || '';
    const ip = request.headers.get('CF-Connecting-IP') || '';
    
    // Detect device type from user agent
    const deviceType = getDeviceType(userAgent);
    
    await env.GO_LINKS.prepare(`
      INSERT INTO analytics (
        link_id, ip_address, user_agent, referer, country, city,
        region, region_code, continent, timezone, postal_code,
        latitude, longitude, asn, as_organization, colo,
        http_protocol, tls_version, bot_category, device_type, client_tcp_rtt,
        timestamp
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)
    `).bind(
      link.id,
      ip,
      userAgent,
      referer,
      cf.country || '',
      cf.city || '',
      cf.region || '',
      cf.regionCode || '',
      cf.continent || '',
      cf.timezone || '',
      cf.postalCode || '',
      cf.latitude || null,
      cf.longitude || null,
      cf.asn || null,
      cf.asOrganization || '',
      cf.colo || '',
      cf.httpProtocol || '',
      cf.tlsVersion || '',
      cf.verifiedBotCategory || '',
      deviceType,
      cf.clientTcpRtt || null,
      getTimestampInTimezone(env.DEFAULT_TIMEZONE || 'UTC')
    ).run();
  } catch (error) {
    // Silent fail for analytics - don't break the redirect
    console.error('Analytics tracking failed:', error);
  }
}

function getDeviceType(userAgent) {
  if (!userAgent) return 'unknown';
  
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  } else if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) {
    return 'bot';
  } else {
    return 'desktop';
  }
}

function getTimestampInTimezone(timezone) {
  try {
    // If timezone is UTC, just return ISO string
    if (timezone === 'UTC') {
      return new Date().toISOString();
    }
    
    // For other timezones, convert to that timezone and format as ISO-like string
    const now = new Date();
    const zonedDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    
    // Get the timezone offset
    const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    const offset = zonedDate.getTime() - utcDate.getTime();
    
    // Apply offset to original date and return ISO string
    const adjustedDate = new Date(now.getTime() + offset);
    return adjustedDate.toISOString();
  } catch (error) {
    // Fallback to UTC if timezone is invalid
    console.error('Invalid timezone, falling back to UTC:', timezone);
    return new Date().toISOString();
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}