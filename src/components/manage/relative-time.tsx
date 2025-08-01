
'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface RelativeTimeProps {
  timestamp: string;
}

export function RelativeTime({ timestamp }: RelativeTimeProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Render nothing on the server and on the initial client render
    // to avoid the hydration mismatch.
    return null;
  }

  // This will now only render on the client after the component has mounted.
  return <>{formatDistanceToNow(new Date(timestamp), { addSuffix: true })}</>;
}
