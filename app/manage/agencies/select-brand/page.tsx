'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Building, AlertCircle } from 'lucide-react';
import { fetchBrandAccountsAction } from '../actions';
import { SafeImage } from '@/components/safe-image';
import { ClientLink } from '@/components/client-link';

interface BrandAccount {
  id: string;
  displayName: string;
  displayImage: string | null;
  status: string;
  isVerified: boolean;
  accountType: string;
  capabilities: string[];
  lastActivityAt: string | null;
  neupId: string | null;
}

export default function SelectBrandPage() {
  const [brandAccounts, setBrandAccounts] = useState<BrandAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const handleFetchBrandAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchBrandAccountsAction();
      if (!result.success) {
        setError(result.error || 'Failed to fetch brand accounts');
        setBrandAccounts([]);
      } else {
        setBrandAccounts(result.accounts);
      }
      setFetched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch brand accounts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold leading-none tracking-tight">
            Select Brand Account
          </h2>
          <p className="text-sm text-muted-foreground">
            Fetch and select a brand account to create an agency
          </p>
        </div>
        <ClientLink href="/manage/agencies" className="text-sm text-muted-foreground hover:underline">
          Back to Agencies
        </ClientLink>
      </div>

      {!fetched && (
        <Card>
          <CardHeader>
            <CardTitle>Fetch Brand Accounts</CardTitle>
            <CardDescription>
              Click the button below to fetch all available brand accounts from NeupID
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleFetchBrandAccounts} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Building className="mr-2 h-4 w-4" />
                  Fetch Brand Accounts
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {fetched && brandAccounts.length === 0 && !loading && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Brand Accounts Found</AlertTitle>
          <AlertDescription>
            No brand accounts were found. Please check your NeupID configuration.
          </AlertDescription>
        </Alert>
      )}

      {brandAccounts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {brandAccounts.length} brand account{brandAccounts.length !== 1 ? 's' : ''} found
            </p>
            <Button variant="outline" size="sm" onClick={handleFetchBrandAccounts} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                'Refresh'
              )}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {brandAccounts.map((account) => (
              <Card key={account.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {account.displayImage && (
                        <SafeImage
                          src={account.displayImage}
                          alt={account.displayName}
                          width={80}
                          height={40}
                          className="mb-3 rounded-md object-contain"
                          fallbackSrc="https://placehold.co/80x40.png"
                        />
                      )}
                      <CardTitle className="text-lg">{account.displayName}</CardTitle>
                      <CardDescription className="mt-2">
                        <div className="flex flex-col gap-1 text-xs">
                          <span>Status: <span className={account.status === 'active' ? 'text-green-600' : 'text-gray-500'}>{account.status}</span></span>
                          <span>Type: {account.accountType}</span>
                          {account.isVerified && <span className="text-blue-600">✓ Verified</span>}
                        </div>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" asChild>
                    <ClientLink href={`/manage/agencies/create?brandId=${account.id}`}>
                      Create Agency
                    </ClientLink>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
