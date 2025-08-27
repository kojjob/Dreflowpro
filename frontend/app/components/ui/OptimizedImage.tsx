'use client';

import React, { useState, memo } from 'react';
import Image from 'next/image';
import { ImageIcon } from 'lucide-react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  quality?: number;
  fill?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = memo(({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 85,
  fill = false,
  objectFit = 'cover',
  loading = 'lazy',
  onLoad,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  // Generate a simple blur placeholder if none provided
  const defaultBlurDataURL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==';

  if (hasError) {
    return (
      <div className={`
        flex items-center justify-center bg-gray-100 text-gray-400
        ${fill ? 'absolute inset-0' : `w-[${width}px] h-[${height}px]`}
        ${className}
      `}>
        <ImageIcon className="w-8 h-8" />
      </div>
    );
  }

  const imageProps = {
    src,
    alt,
    className: `
      transition-opacity duration-300
      ${isLoading ? 'opacity-0' : 'opacity-100'}
      ${className}
    `,
    onLoad: handleLoad,
    onError: handleError,
    quality,
    priority,
    placeholder,
    blurDataURL: blurDataURL || defaultBlurDataURL,
    sizes,
    ...(loading && { loading }),
    ...(fill && { fill }),
    ...(!fill && width && height && { width, height }),
    ...(objectFit && { style: { objectFit } })
  };

  return (
    <div className={`relative ${fill ? 'w-full h-full' : ''}`}>
      {isLoading && (
        <div className={`
          absolute inset-0 bg-gray-200 animate-pulse
          flex items-center justify-center
          ${fill ? '' : `w-[${width}px] h-[${height}px]`}
        `}>
          <ImageIcon className="w-8 h-8 text-gray-400" />
        </div>
      )}
      <Image {...imageProps} />
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;

// Preset configurations for common use cases
export const AvatarImage = memo(({ src, alt, size = 40, ...props }: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) => (
  <OptimizedImage
    src={src}
    alt={alt}
    width={size}
    height={size}
    className={`rounded-full ${props.className || ''}`}
    quality={90}
    priority={false}
    placeholder="blur"
  />
));

export const HeroImage = memo(({ src, alt, ...props }: {
  src: string;
  alt: string;
  className?: string;
}) => (
  <OptimizedImage
    src={src}
    alt={alt}
    fill
    className={props.className}
    quality={95}
    priority={true}
    placeholder="blur"
    sizes="100vw"
    objectFit="cover"
  />
));

export const ThumbnailImage = memo(({ src, alt, ...props }: {
  src: string;
  alt: string;
  className?: string;
}) => (
  <OptimizedImage
    src={src}
    alt={alt}
    width={150}
    height={150}
    className={props.className}
    quality={80}
    placeholder="blur"
    objectFit="cover"
  />
));

AvatarImage.displayName = 'AvatarImage';
HeroImage.displayName = 'HeroImage';
ThumbnailImage.displayName = 'ThumbnailImage';
