'use client';

import { useState, useCallback, useMemo } from 'react';
import Image, { ImageProps } from 'next/image';
import { combineClasses } from '../../lib/utils';

// Image optimization configuration
const IMAGE_CONFIG = {
  quality: 85, // Good balance between quality and file size
  formats: ['image/webp', 'image/avif'], // Modern formats
  deviceSizes: [640, 768, 1024, 1280, 1600], // Responsive breakpoints
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Icon sizes
  placeholder: 'blur' as const,
  blurDataURL: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==', // Tiny blur placeholder
} as const;

// Lazy loading intersection observer options
const INTERSECTION_OPTIONS = {
  rootMargin: '50px 0px', // Start loading 50px before image comes into view
  threshold: 0.01, // Trigger when 1% of image is visible
};

interface OptimizedImageProps extends Omit<ImageProps, 'placeholder' | 'blurDataURL'> {
  fallbackSrc?: string;
  showPlaceholder?: boolean;
  enableLazyLoading?: boolean;
  optimizationLevel?: 'low' | 'medium' | 'high';
}

/**
 * Optimized image component with lazy loading, WebP support, and error handling
 */
export function OptimizedImage({
  src,
  alt,
  fallbackSrc,
  showPlaceholder = true,
  enableLazyLoading = true,
  optimizationLevel = 'medium',
  className,
  ...props
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Adjust quality based on optimization level
  const quality = useMemo(() => {
    switch (optimizationLevel) {
      case 'low': return 70;
      case 'medium': return 85;
      case 'high': return 95;
      default: return 85;
    }
  }, [optimizationLevel]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setImageError(true);
    setIsLoading(false);
  }, []);

  // If image failed to load and we have a fallback
  if (imageError && fallbackSrc) {
    return (
      <OptimizedImage
        {...props}
        src={fallbackSrc}
        alt={alt}
        className={className}
        fallbackSrc={undefined} // Prevent infinite recursion
      />
    );
  }

  // If image failed to load and no fallback, show placeholder
  if (imageError) {
    return (
      <div 
        className={combineClasses(
          "flex items-center justify-center bg-gray-200 text-gray-400 text-sm",
          className
        )}
        style={{ width: props.width, height: props.height }}
      >
        Image not found
      </div>
    );
  }

  return (
    <div className="relative">
      <Image
        {...props}
        src={src}
        alt={alt}
        quality={quality}
        placeholder={showPlaceholder ? IMAGE_CONFIG.placeholder : 'empty'}
        blurDataURL={showPlaceholder ? IMAGE_CONFIG.blurDataURL : undefined}
        loading={enableLazyLoading ? 'lazy' : 'eager'}
        onLoad={handleLoad}
        onError={handleError}
        className={combineClasses(
          'transition-opacity duration-300',
          isLoading && showPlaceholder ? 'opacity-0' : 'opacity-100',
          className
        )}
      />
      
      {/* Loading spinner overlay */}
      {isLoading && showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

interface LazyImageProps extends OptimizedImageProps {
  threshold?: number;
  rootMargin?: string;
}

/**
 * Advanced lazy loading image with intersection observer
 */
export function LazyImage({
  threshold = INTERSECTION_OPTIONS.threshold,
  rootMargin = INTERSECTION_OPTIONS.rootMargin,
  ...props
}: LazyImageProps) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [imageRef, setImageRef] = useState<HTMLDivElement | null>(null);

  // Setup intersection observer for lazy loading
  React.useEffect(() => {
    if (!imageRef || shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.unobserve(imageRef);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(imageRef);

    return () => {
      observer.disconnect();
    };
  }, [imageRef, shouldLoad, threshold, rootMargin]);

  if (!shouldLoad) {
    return (
      <div 
        ref={setImageRef}
        className={combineClasses(
          "flex items-center justify-center bg-gray-100 animate-pulse",
          props.className
        )}
        style={{ width: props.width, height: props.height }}
      >
        <div className="w-8 h-8 text-gray-400">📷</div>
      </div>
    );
  }

  return <OptimizedImage {...props} enableLazyLoading={false} />;
}

/**
 * Image gallery with lazy loading and optimization
 */
interface ImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }>;
  className?: string;
  imageClassName?: string;
  enableLazyLoading?: boolean;
}

export function ImageGallery({
  images,
  className,
  imageClassName,
  enableLazyLoading = true,
}: ImageGalleryProps) {
  const ImageComponent = enableLazyLoading ? LazyImage : OptimizedImage;

  return (
    <div className={combineClasses('grid gap-4', className)}>
      {images.map((image, index) => (
        <ImageComponent
          key={`${image.src}-${index}`}
          src={image.src}
          alt={image.alt}
          width={image.width || 400}
          height={image.height || 300}
          className={combineClasses('rounded-lg object-cover', imageClassName)}
        />
      ))}
    </div>
  );
}

/**
 * Avatar component with optimized loading
 */
interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };

  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (!src) {
    return (
      <div 
        className={combineClasses(
          'flex items-center justify-center bg-blue-500 text-white font-medium rounded-full',
          sizeClasses[size],
          className
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={`${name} avatar`}
      width={size === 'xl' ? 64 : size === 'lg' ? 48 : size === 'md' ? 40 : 32}
      height={size === 'xl' ? 64 : size === 'lg' ? 48 : size === 'md' ? 40 : 32}
      className={combineClasses('rounded-full object-cover', sizeClasses[size], className)}
      fallbackSrc={undefined} // Will show initials if image fails
      onError={() => {
        // Custom error handling - could set state to show initials
      }}
    />
  );
}

/**
 * Hook for preloading images
 */
export function useImagePreloader() {
  const preloadedImages = React.useRef(new Set<string>());

  const preloadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (preloadedImages.current.has(src)) {
        resolve();
        return;
      }

      const img = new window.Image();
      
      img.onload = () => {
        preloadedImages.current.add(src);
        resolve();
      };
      
      img.onerror = () => {
        reject(new Error(`Failed to preload image: ${src}`));
      };
      
      img.src = src;
    });
  }, []);

  const preloadImages = useCallback(async (srcs: string[]) => {
    try {
      await Promise.all(srcs.map(preloadImage));
    } catch (error) {
      console.warn('Some images failed to preload:', error);
    }
  }, [preloadImage]);

  return { preloadImage, preloadImages };
}

export default OptimizedImage;