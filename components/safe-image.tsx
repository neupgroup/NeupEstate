
"use client";

import Image, { type ImageProps } from 'next/image';
import { forwardRef, useEffect, useState } from 'react';

interface SafeImageProps extends ImageProps {
    fallbackSrc: string;
}

export const SafeImage = forwardRef<HTMLImageElement, SafeImageProps>(({ fallbackSrc, ...props }, ref) => {
  const [imgSrc, setImgSrc] = useState(props.src);

  useEffect(() => {
    setImgSrc(props.src);
  }, [props.src]);

  return (
    <Image
      ref={ref}
      {...props}
      // Keep remote images on their original URL instead of requesting
      // /_next/image and having Next fetch/process the upstream asset.
      unoptimized
      src={imgSrc || fallbackSrc}
      onError={() => {
        setImgSrc(fallbackSrc);
      }}
    />
  );
});
SafeImage.displayName = "SafeImage";
