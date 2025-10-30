import { useState, useEffect } from 'react';
import { ApiService } from '@/lib/api';
import type { Link } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit2, Trash2, Plus, Search, ExternalLink } from 'lucide-react';

interface LinkManagerProps {
  apiService: ApiService;
}

export function LinkManager({ apiService }: LinkManagerProps) {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [formData, setFormData] = useState({ shortCode: '', destinationUrl: '' });

  const loadLinks = async (page = 1, search = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getLinks({ 
        page, 
        limit: 20, 
        search: search || undefined 
      });
      setLinks(response.links);
      setTotalPages(response.pagination.pages);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load links');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, []);

  const handleSearch = () => {
    loadLinks(1, searchTerm);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLink) {
        await apiService.updateLink(editingLink.id, formData);
      } else {
        await apiService.createLink(formData);
      }
      setIsDialogOpen(false);
      setEditingLink(null);
      setFormData({ shortCode: '', destinationUrl: '' });
      loadLinks(currentPage, searchTerm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  const handleEdit = (link: Link) => {
    setEditingLink(link);
    setFormData({ shortCode: link.short_code, destinationUrl: link.destination_url });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this link?')) {
      try {
        await apiService.deleteLink(id);
        loadLinks(currentPage, searchTerm);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete link');
      }
    }
  };

  const openCreateDialog = () => {
    setEditingLink(null);
    setFormData({ shortCode: '', destinationUrl: '' });
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Link Management</CardTitle>
        <CardDescription>
          Create and manage your short URLs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 mb-4">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Search links..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                New Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingLink ? 'Edit Link' : 'Create New Link'}
                </DialogTitle>
                <DialogDescription>
                  {editingLink ? 'Update the link details below.' : 'Fill in the details for your new short link.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateOrUpdate} className="space-y-4">
                <div>
                  <Label htmlFor="shortCode">Short Code</Label>
                  <Input
                    id="shortCode"
                    value={formData.shortCode}
                    onChange={(e) => setFormData({ ...formData, shortCode: e.target.value })}
                    placeholder="e.g., github"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="destinationUrl">Destination URL</Label>
                  <Input
                    id="destinationUrl"
                    type="url"
                    value={formData.destinationUrl}
                    onChange={(e) => setFormData({ ...formData, destinationUrl: e.target.value })}
                    placeholder="https://example.com"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingLink ? 'Update' : 'Create'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Short Code</TableHead>
                  <TableHead>Destination URL</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell className="font-mono">{link.short_code}</TableCell>
                    <TableCell>
                      <a
                        href={link.destination_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline max-w-xs truncate"
                      >
                        {link.destination_url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell>{link.click_count}</TableCell>
                    <TableCell>{new Date(link.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(link)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(link.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
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
                  onClick={() => loadLinks(currentPage - 1, searchTerm)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => loadLinks(currentPage + 1, searchTerm)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}