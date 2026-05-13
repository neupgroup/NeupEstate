'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SafeImage } from '@/components/safe-image';
import { fetchBrandAccountsAction } from '@/app/manage/agencies/actions';

interface BrandAccount {
  id: string;
  displayName: string;
  displayImage: string;
  status: string;
  isVerified: boolean;
  accountType: string;
  capabilities: string[];
}

interface BrandAccountsResponse {
  success: boolean;
  accounts: BrandAccount[];
  error?: string;
}

export function ApiRequestButton() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BrandAccountsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetchBrandAccounts = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await fetchBrandAccountsAction();
      
      if (!result.success) {
        setError(result.error || 'Failed to fetch brand accounts');
      } else {
        setData(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button 
          onClick={handleFetchBrandAccounts} 
          disabled={loading}
          variant="outline"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fetching Brand Accounts...
            </>
          ) : (
            <>
              <Building2 className="mr-2 h-4 w-4" />
              Fetch Brand Accounts
            </>
          )}
        </Button>
        {data && (
          <span className="text-sm text-muted-foreground">
            {data.accounts.length} brand account{data.accounts.length !== 1 ? 's' : ''} found
          </span>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {data && data.success && (
        <>
          {data.accounts.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Brand Accounts Found</AlertTitle>
              <AlertDescription>
                You don't have any brand accounts associated with your NeupID. Brand accounts are required to create agencies.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.accounts.map((brand) => (
                <Card key={brand.id}>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <SafeImage
                        src={brand.displayImage}
                        alt={brand.displayName}
                        width={48}
                        height={48}
                        className="rounded-lg object-contain border"
                        data-ai-hint="brand logo"
                        fallbackSrc="https://placehold.co/48x48.png"
                      />
                      <div className="flex-1">
                        <CardTitle className="text-lg">{brand.displayName}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {brand.accountType}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={brand.status === 'active' ? 'default' : 'secondary'}>
                        {brand.status}
                      </Badge>
                      {brand.isVerified && (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                    </div>

                    {brand.capabilities && brand.capabilities.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Capabilities:</p>
                        <div className="flex flex-wrap gap-1">
                          {brand.capabilities.slice(0, 3).map((cap) => (
                            <Badge key={cap} variant="secondary" className="text-xs">
                              {cap}
                            </Badge>
                          ))}
                          {brand.capabilities.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{brand.capabilities.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">{brand.id}</code>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
