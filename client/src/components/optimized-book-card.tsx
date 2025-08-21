import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Book } from "@shared/schema";
import { BookOpen } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { usePerformanceTelemetry } from "@/hooks/usePerformanceTelemetry";

interface OptimizedBookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onUpdate: () => void;
  customDimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  position: {
    x: number;
    y: number;
    z: number;
    rotation: number;
  };
  tidyMode?: boolean;
}

export default function OptimizedBookCard({
  book,
  onSelect,
  onUpdate,
  customDimensions,
  position,
  tidyMode = false
}: OptimizedBookCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { scheduleCommit } = usePerformanceTelemetry();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null);

  // Create combined transform to avoid multiple reflows
  const transform = useMemo(() => {
    const rotation = tidyMode ? 0 : position.rotation;
    return `translate3d(${position.x}px, ${position.y}px, 0) rotateY(${rotation}deg)`;
  }, [position.x, position.y, position.rotation, tidyMode]);

  // Update position using single rAF commit
  useEffect(() => {
    if (!cardRef.current) return;

    scheduleCommit(() => {
      if (!cardRef.current) return;
      
      // Apply all transforms in a single property update
      cardRef.current.style.transform = transform;
      cardRef.current.style.zIndex = Math.round(position.z * 100).toString();
      
      if (customDimensions) {
        cardRef.current.style.width = `${customDimensions.width}px`;
        cardRef.current.style.height = `${customDimensions.height}px`;
      }
    });
  }, [transform, position.z, customDimensions, scheduleCommit]);

  const updateBookMutation = useMutation({
    mutationFn: async (updates: Partial<Book>) => {
      const response = await fetch(`/api/books/${book.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update book');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      onUpdate();
    },
  });

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only trigger if not during a scroll gesture
    if (touchStartTime && Date.now() - touchStartTime < 200) {
      return; // Too quick, likely a scroll
    }
    
    onSelect(book);
  }, [book, onSelect, touchStartTime]);

  const handleTouchStart = useCallback(() => {
    setTouchStartTime(Date.now());
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Clear touch start time after a delay to allow click detection
    setTimeout(() => setTouchStartTime(null), 300);
  }, []);

  const handleMouseEnter = useCallback(() => {
    // Only trigger hover on desktop (non-touch devices)
    if (!touchStartTime) {
      setIsHovered(true);
    }
  }, [touchStartTime]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const dimensions = customDimensions || {
    width: 140,
    height: 200,
    depth: 15
  };

  return (
    <div
      ref={cardRef}
      className="absolute cursor-pointer transition-all duration-300 ease-out will-change-transform"
      style={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        transform,
        transformStyle: 'preserve-3d',
        perspective: '1000px'
      }}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid={`book-card-${book.id}`}
    >
      {/* Book Cover */}
      <div
        className="relative w-full h-full rounded-lg shadow-lg overflow-hidden"
        style={{
          background: book.coverUrl ? 'transparent' : '#f3f4f6',
          transform: isHovered && !tidyMode ? 'translateZ(10px) rotateX(-5deg)' : 'translateZ(0)',
          transition: 'transform 0.3s ease-out',
          filter: isHovered ? 'brightness(1.1)' : 'brightness(1)',
        }}
      >
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover"
            style={{
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
            }}
            onLoad={() => setIsLoaded(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
            <BookOpen size={Math.min(dimensions.width * 0.3, 48)} className="text-blue-500" />
          </div>
        )}

        {/* Overlay for additional info on hover */}
        {isHovered && (
          <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col justify-end p-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
            <div className="text-white text-xs">
              <p className="font-semibold truncate">{book.title}</p>
              {book.author && <p className="truncate opacity-80">{book.author}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Book Spine (3D effect) */}
      <div
        className="absolute top-0 right-0 bg-gray-700"
        style={{
          width: `${dimensions.depth}px`,
          height: `${dimensions.height}px`,
          transform: `rotateY(90deg) translateZ(${dimensions.depth / 2}px)`,
          borderRadius: '0 4px 4px 0',
          background: book.coverUrl 
            ? `linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)`
            : '#374151'
        }}
      />

      {/* Status indicator */}
      {book.status && book.status !== 'want-to-read' && (
        <div
          className="absolute top-1 right-1 w-2 h-2 rounded-full"
          style={{
            backgroundColor: book.status === 'reading' ? '#10b981' : '#3b82f6',
            boxShadow: '0 0 4px rgba(0,0,0,0.3)'
          }}
        />
      )}
    </div>
  );
}