
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
      src={imgSrc || fallbackSrc}
      onError={() => {
        setImgSrc(fallbackSrc);
      }}
    />
  );
});
SafeImage.displayName = "SafeImage";
