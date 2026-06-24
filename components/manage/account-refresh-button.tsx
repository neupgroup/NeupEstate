'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { refreshAccountDisplayInfo } from '@/services/account-service';

type Status = 'idle' | 'loading' | 'success' | 'error' | 'no_change';

interface Props {
  accountId: string;
  currentDisplayName?: string;
  currentRoleIds?: string[];
  currentPermissions?: string[];
  onRefreshed?: (displayName: string | null, displayImage: string | null) => void;
}

function normalizePermissionList(value?: string[]): string {
  return [...new Set((value ?? []).map((item) => item.trim()).filter(Boolean))].sort().join('|');
}

function normalizeRoleList(value?: string[]): string {
  return [...new Set((value ?? []).map((item) => item.trim()).filter(Boolean))].sort().join('|');
}

export function AccountRefreshButton({
  accountId,
  currentDisplayName,
  currentRoleIds,
  currentPermissions,
  onRefreshed,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string>('');

  async function handleClick() {
    setStatus('loading');
    setMessage('');

    try {
      const result = await refreshAccountDisplayInfo(accountId);

      if (!result) {
        setStatus('error');
        setMessage('Could not reach NeupID.');
        return;
      }

      const changedDisplayName = result.displayName !== currentDisplayName;
      const changedRole = normalizeRoleList(result.roleIds) !== normalizeRoleList(currentRoleIds);
      const changedPermissions =
        normalizePermissionList(result.permissions) !== normalizePermissionList(currentPermissions);
      const changed = changedDisplayName || changedRole || changedPermissions;
      setStatus(changed ? 'success' : 'no_change');
      setMessage(
        changed
          ? 'Synced profile, role, and permissions.'
          : 'Already up to date.',
      );
      onRefreshed?.(result.displayName, result.displayImage);
      router.refresh();
    } catch {
      setStatus('error');
      setMessage('Something went wrong.');
    } finally {
      // Reset to idle after 4 s
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 4000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={status === 'loading'}
        className="gap-1.5"
      >
        {status === 'loading' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        {status === 'loading' ? 'Syncing…' : 'Sync'}
      </Button>

      {status === 'success' && (
        <span className="flex items-center gap-1 text-xs text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {message}
        </span>
      )}
      {status === 'no_change' && (
        <span className="text-xs text-muted-foreground">{message}</span>
      )}
      {status === 'error' && (
        <span className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          {message}
        </span>
      )}
    </div>
  );
}
