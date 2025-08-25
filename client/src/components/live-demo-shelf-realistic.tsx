import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { calculateLayout, normaliseBooks, DEFAULT_CFG, type Book as LayoutBook, type LayoutItem } from '@/layout/ShelfieLayoutEngine';
import { useQuery } from '@tanstack/react-query';
import type { Book } from '../../../shared/schema';

// Simple fallback color extraction - no external dependencies needed
function getBookColor(coverUrl?: string): string {
  // Extract color from common color names or return fallback
  if (!coverUrl) return '#4a5568';
  
  // Basic hue extraction from URL patterns
  if (coverUrl.includes('blue')) return '#3182ce';
  if (coverUrl.includes('red')) return '#e53e3e';
  if (coverUrl.includes('green')) return '#38a169';
  if (coverUrl.includes('orange')) return '#dd6b20';
  if (coverUrl.includes('purple')) return '#805ad5';
  
  // Fallback color
  return '#4a5568';
}

interface LiveDemoShelfRealisticProps {
  reducedMotion?: boolean;
}

// Convert database book to layout engine format
function convertToLayoutBook(book: Book, index: number): LayoutBook {
  return {
    id: book.id,
    phys: {
      width_mm: book.width ? parseFloat(book.width) * 10 : 120, // Convert cm to mm
      height_mm: book.height ? parseFloat(book.height) * 10 : 190, // Convert cm to mm  
      spine_mm: book.depth ? parseFloat(book.depth) * 10 : 15 // Convert cm to mm
    }
  };
}

// Individual book component using the actual app's book-3d styling
function LiveBookCard({ 
  book, 
  layoutItem, 
  dominantColor 
}: { 
  book: Book; 
  layoutItem: LayoutItem;
  dominantColor: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      className="absolute group"
      style={{
        left: `${layoutItem.x}px`,
        top: `${layoutItem.y}px`,
        width: `${layoutItem.w}px`,
        height: `${layoutItem.h}px`,
        zIndex: layoutItem.z
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`live-demo-book-${book.title.replace(/\s+/g, '-').toLowerCase()}`}
    >
      {/* Contact shadow */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: 'auto',
          left: '-8%',
          right: '-8%',
          bottom: '-10%',
          height: '22px',
          background: 'radial-gradient(50% 100% at 50% 0, rgba(0,0,0,.35), rgba(0,0,0,0) 70%)',
          transform: 'translateZ(-1px)',
          zIndex: -1,
          transition: 'opacity 220ms cubic-bezier(.2,.8,.2,1)'
        }}
      />
      
      {/* Main book-3d container */}
      <div
        className="book-3d cursor-pointer relative"
        style={{
          '--book-thickness': `${layoutItem.d * 0.4}px`,
          '--cover-color': dominantColor,
          width: `${layoutItem.w}px`,
          height: `${layoutItem.h}px`,
          transform: `rotateY(${layoutItem.ry}deg)`,
          transition: 'transform 220ms cubic-bezier(.2,.8,.2,1)'
        } as React.CSSProperties}
      >
        <div 
          className="book-3d__inner"
          style={{
            position: 'relative',
            transformStyle: 'preserve-3d',
            transform: isHovered 
              ? 'rotateY(-25deg) translateZ(2px)' 
              : 'rotateY(-25deg) translateZ(1px)',
            transition: 'transform 220ms cubic-bezier(.2,.8,.2,1)',
            margin: 0,
            boxSizing: 'border-box',
            boxShadow: isHovered
              ? '0 8px 15px rgba(0,0,0,.22), 0 30px 50px -20px rgba(0,0,0,.4)'
              : '0 6px 10px rgba(0,0,0,.18), 0 24px 40px -20px rgba(0,0,0,.35)'
          }}
        >
          {/* Book cover image */}
          <img 
            className="book-3d__cover"
            src={book.coverImage || '/placeholder-book.jpg'} 
            alt={`Cover of ${book.title} by ${book.author}`}
            style={{
              width: `${layoutItem.w}px`,
              height: `${layoutItem.h}px`,
              borderRadius: '4px 2px 2px 4px',
              transform: `translateZ(var(--book-thickness))`,
              boxShadow: `
                5px 5px 20px rgba(0, 0, 0, 0.2),
                inset -1px 0 0 rgba(255, 255, 255, 0.3),
                inset 0 -1px 0 rgba(255, 255, 255, 0.2),
                inset 1px 1px 1px rgba(255, 255, 255, 0.1),
                inset 1px -1px 1px rgba(255, 255, 255, 0.1)
              `,
              filter: 'saturate(.97) contrast(1.03) brightness(.99)'
            }}
            loading="lazy"
          />
        </div>
      </div>

      {/* Enhanced tooltip */}
      {isHovered && (
        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-gray-900/95 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-lg shadow-xl z-50 whitespace-nowrap pointer-events-none">
          <div className="font-medium">{book.title}</div>
          <div className="text-gray-300 text-xs">{book.author}</div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900/95"></div>
        </div>
      )}
    </div>
  );
}

export default function LiveDemoShelfRealistic({ reducedMotion = false }: LiveDemoShelfRealisticProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [containerWidth, setContainerWidth] = useState(400);
  const [dominantColors, setDominantColors] = useState<Map<string, string>>(new Map());

  // Fetch live demo books
  const { data: books = [], isLoading, isError } = useQuery<Book[]>({
    queryKey: ['/api/demo/recent-books'],
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Extract colors from book covers (simplified for demo)
  useEffect(() => {
    const colorMap = new Map<string, string>();
    
    for (const book of books) {
      const color = getBookColor(book.coverImage || undefined);
      colorMap.set(book.id, color);
    }
    
    setDominantColors(colorMap);
  }, [books]);

  useEffect(() => {
    const updateWidth = () => {
      setContainerWidth(Math.min(600, window.innerWidth - 48)); // Max 600px with padding
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Convert database books to layout engine format and calculate positions
  const layoutItems = useMemo(() => {
    if (!books.length) return [];
    
    const layoutBooks = books.map((book, index) => convertToLayoutBook(book, index));
    const normalizedDims = normaliseBooks(layoutBooks, DEFAULT_CFG.BASE_HEIGHT);
    
    // Use smaller container width for demo and tighter spacing
    const demoConfig = {
      ...DEFAULT_CFG,
      targetRowHeight: 160, // Smaller for demo
      gutterX: 8,
      gutterY: 10,
      jitterX: 4,
      maxTiltY: 6
    };
    
    return calculateLayout(layoutBooks, normalizedDims, containerWidth, demoConfig);
  }, [books, containerWidth]);

  // Calculate total content dimensions
  const contentDimensions = useMemo(() => {
    if (layoutItems.length === 0) return { width: containerWidth, height: 200 };
    
    const maxX = Math.max(...layoutItems.map(item => item.x + item.w));
    const maxY = Math.max(...layoutItems.map(item => item.y + item.h));
    
    return {
      width: Math.max(maxX + 20, containerWidth),
      height: maxY + 20
    };
  }, [layoutItems, containerWidth]);

  const scrollLeft = useCallback(() => {
    const newPosition = Math.max(0, scrollPosition - containerWidth * 0.7);
    setScrollPosition(newPosition);
  }, [scrollPosition, containerWidth]);

  const scrollRight = useCallback(() => {
    const maxScroll = Math.max(0, contentDimensions.width - containerWidth);
    const newPosition = Math.min(maxScroll, scrollPosition + containerWidth * 0.7);
    setScrollPosition(newPosition);
  }, [scrollPosition, containerWidth, contentDimensions.width]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollLeft();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollRight();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const maxScroll = Math.max(0, contentDimensions.width - containerWidth);

  if (isLoading) {
    return (
      <div className="relative overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Your library reimagined</h3>
        </div>
        <div className="h-48 flex items-center justify-center">
          <div className="text-gray-500 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
            <p>Loading real books...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !books.length) {
    return (
      <div className="relative overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Your library reimagined</h3>
        </div>
        <div className="h-48 flex items-center justify-center">
          <div className="text-gray-500 text-center">
            <p>Unable to load live demo books</p>
            <p className="text-sm">Please try again later</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      {/* Navigation buttons */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Your library reimagined</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={scrollLeft}
            disabled={scrollPosition <= 0}
            aria-label="Scroll books left"
            data-testid="button-scroll-left"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={scrollRight}
            disabled={scrollPosition >= maxScroll}
            aria-label="Scroll books right"
            data-testid="button-scroll-right"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Books container with realistic layout engine and proper perspective */}
      <div 
        className="relative overflow-hidden"
        style={{ 
          height: `${Math.min(contentDimensions.height, 280)}px`,
          width: '100%',
          perspective: '1200px',
          perspectiveOrigin: 'center center'
        }}
      >
        <div 
          className="relative transition-transform duration-300 ease-out"
          style={{ 
            transform: `translateX(-${scrollPosition}px)`,
            width: `${contentDimensions.width}px`,
            height: `${contentDimensions.height}px`,
            transformStyle: 'preserve-3d'
          }}
          role="region"
          aria-live="polite"
          aria-label="Live 3D book shelf with real user books"
        >
          {layoutItems.map((layoutItem, index) => {
            const book = books[index];
            const dominantColor = dominantColors.get(book.id) || '#4a5568';
            
            return (
              <LiveBookCard
                key={layoutItem.id}
                book={book}
                layoutItem={layoutItem}
                dominantColor={dominantColor}
              />
            );
          })}
        </div>
      </div>

      {/* Enhanced hint text */}
      <p className="text-sm text-gray-600 text-center mt-4 italic">
        Real books from an actual Shelfie library — scroll to explore the 3D shelf
      </p>
    </div>
  );
}