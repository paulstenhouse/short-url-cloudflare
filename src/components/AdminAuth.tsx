import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface AdminAuthProps {
  onAuthenticated: (key: string) => void;
}

export function AdminAuth({ onAuthenticated }: AdminAuthProps) {
  const [key, setKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) {
      onAuthenticated(key.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Access</CardTitle>
          <CardDescription>
            Enter your admin key to access the short URL management panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="adminKey">Admin Key</Label>
              <Input
                id="adminKey"
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Enter admin key"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Access Admin Panel
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}