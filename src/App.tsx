import { useState, useEffect } from 'react';
import { AdminAuth } from '@/components/AdminAuth';
import { LinkManager } from '@/components/LinkManager';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { ApiService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Link, BarChart3, LogOut } from 'lucide-react';

function App() {
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [apiService, setApiService] = useState<ApiService | null>(null);
  const [activeTab, setActiveTab] = useState<'links' | 'analytics'>('links');

  useEffect(() => {
    // Check URL params for admin key
    const urlParams = new URLSearchParams(window.location.search);
    const keyFromUrl = urlParams.get('key');
    if (keyFromUrl) {
      setAdminKey(keyFromUrl);
      setApiService(new ApiService(keyFromUrl));
      // Keep the key in URL - don't clean it
    }
  }, []);

  const handleAuthenticated = (key: string) => {
    setAdminKey(key);
    setApiService(new ApiService(key));
    // Add key to URL params
    const url = new URL(window.location.href);
    url.searchParams.set('key', key);
    window.history.pushState({}, '', url);
  };

  const handleLogout = () => {
    setAdminKey(null);
    setApiService(null);
    setActiveTab('links');
    // Remove key from URL params
    const url = new URL(window.location.href);
    url.searchParams.delete('key');
    window.history.pushState({}, '', url);
  };

  if (!adminKey || !apiService) {
    return <AdminAuth onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Short URL Admin
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <nav className="flex gap-2">
                <Button
                  variant={activeTab === 'links' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('links')}
                  className="flex items-center gap-2"
                >
                  <Link className="h-4 w-4" />
                  Links
                </Button>
                <Button
                  variant={activeTab === 'analytics' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('analytics')}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </Button>
              </nav>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeTab === 'links' && <LinkManager apiService={apiService} />}
        {activeTab === 'analytics' && <AnalyticsDashboard apiService={apiService} />}
      </main>
    </div>
  );
}

export default App;
