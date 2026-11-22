
"use client";

import Image, { type ImageProps } from 'next/image';
import { forwardRef, useEffect, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

type SafeImageProps = ImageProps;

export const SafeImage = forwardRef<HTMLImageElement, SafeImageProps>(({ onError, ...props }, ref) => {
  const [hasFailed, setHasFailed] = useState(!props.src);

  useEffect(() => {
    setHasFailed(!props.src);
  }, [props.src]);

  if (hasFailed) {
    return (
      <div
        className={`flex items-center justify-center !bg-white text-gray-300 ${props.className ?? ''}`}
        style={{
          ...(props.fill ? { position: 'absolute' as const, inset: 0 } : {}),
          ...(!props.className && props.width ? { width: props.width } : {}),
          ...(!props.className && props.height ? { height: props.height } : {}),
          ...props.style,
        }}
        role="img"
        aria-label={props.alt || 'Image unavailable'}
      >
        <ImageIcon aria-hidden="true" className="h-7 w-7" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <Image
      ref={ref}
      {...props}
      // Keep remote images on their original URL instead of requesting
      // /_next/image and having Next fetch/process the upstream asset.
      unoptimized
      onError={(event) => {
        setHasFailed(true);
        onError?.(event);
      }}
    />
  );
});
SafeImage.displayName = "SafeImage";
