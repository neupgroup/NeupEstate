'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createAgencyFromBrandAction } from './actions';
import type { BrandAccount } from '@/services/neupid/get-brand-accounts';

type CreateAgencyFromBrandButtonProps = {
  brand: BrandAccount;
};

export function CreateAgencyFromBrandButton({ brand }: CreateAgencyFromBrandButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);

    try {
      const result = await createAgencyFromBrandAction(brand);

      if (result.success) {
        toast({
          title: 'Agency Created',
          description: `Agency "${brand.displayName}" has been created successfully.`,
        });

        router.push('/manage/agencies');
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to Create Agency',
          description: result.error || 'An error occurred while creating the agency.',
        });
        setLoading(false);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleCreate} disabled={loading} className="w-full">
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating...
        </>
      ) : (
        <>
          <Building className="mr-2 h-4 w-4" />
          Create Agency
        </>
      )}
    </Button>
  );
}
