import { useState, useEffect } from 'react';
import { ApiService } from '@/lib/api';
import type { AnalyticsEntry, Link } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart3, Globe, Filter, ExternalLink } from 'lucide-react';

interface AnalyticsDashboardProps {
  apiService: ApiService;
}

export function AnalyticsDashboard({ apiService }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsEntry[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    linkId: '',
    country: '',
    dateFrom: '',
    dateTo: ''
  });

  const loadAnalytics = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const filterParams: any = { page, limit: 50 };
      
      if (filters.linkId) filterParams.linkId = parseInt(filters.linkId);
      if (filters.country) filterParams.country = filters.country;
      if (filters.dateFrom) filterParams.dateFrom = filters.dateFrom;
      if (filters.dateTo) filterParams.dateTo = filters.dateTo;

      const response = await apiService.getAnalytics(filterParams);
      setAnalytics(response.analytics);
      setTotalPages(response.pagination.pages);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadLinks = async () => {
    try {
      const response = await apiService.getLinks({ limit: 1000 });
      setLinks(response.links);
    } catch (err) {
      console.error('Failed to load links for filter:', err);
    }
  };

  useEffect(() => {
    loadAnalytics();
    loadLinks();
  }, []);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    loadAnalytics(1);
  };

  const clearFilters = () => {
    setFilters({ linkId: '', country: '', dateFrom: '', dateTo: '' });
    setTimeout(() => loadAnalytics(1), 0);
  };

  const getCountryStats = () => {
    const countryMap = new Map<string, number>();
    analytics.forEach(entry => {
      if (entry.country) {
        countryMap.set(entry.country, (countryMap.get(entry.country) || 0) + 1);
      }
    });
    return Array.from(countryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  };

  const getLinkStats = () => {
    const linkMap = new Map<string, number>();
    analytics.forEach(entry => {
      if (entry.short_code) {
        linkMap.set(entry.short_code, (linkMap.get(entry.short_code) || 0) + 1);
      }
    });
    return Array.from(linkMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics Dashboard
          </CardTitle>
          <CardDescription>
            Track clicks and visitor information for your short URLs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button onClick={() => loadAnalytics(currentPage)} variant="outline">
              Refresh
            </Button>
          </div>

          {showFilters && (
            <Card className="mb-4">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="linkFilter">Link</Label>
                    <select
                      id="linkFilter"
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                      value={filters.linkId}
                      onChange={(e) => handleFilterChange('linkId', e.target.value)}
                    >
                      <option value="">All Links</option>
                      {links.map(link => (
                        <option key={link.id} value={link.id}>
                          {link.short_code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="countryFilter">Country</Label>
                    <Input
                      id="countryFilter"
                      placeholder="e.g., US, UK"
                      value={filters.country}
                      onChange={(e) => handleFilterChange('country', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateFrom">From Date</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateTo">To Date</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={applyFilters}>Apply Filters</Button>
                  <Button variant="outline" onClick={clearFilters}>Clear</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Top Countries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getCountryStats().map(([country, count]) => (
                    <div key={country} className="flex justify-between">
                      <span>{country || 'Unknown'}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Popular Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getLinkStats().map(([shortCode, count]) => (
                    <div key={shortCode} className="flex justify-between">
                      <span className="font-mono">{shortCode}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Link</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Referer</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono">{entry.short_code}</TableCell>
                      <TableCell>{entry.country || '-'}</TableCell>
                      <TableCell>{entry.city || '-'}</TableCell>
                      <TableCell>
                        {entry.referer ? (
                          <a
                            href={entry.referer}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline max-w-xs truncate"
                          >
                            {new URL(entry.referer).hostname}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          'Direct'
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(entry.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={currentPage <= 1}
                    onClick={() => loadAnalytics(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    onClick={() => loadAnalytics(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}