import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { demoBooksData, type BookDemoItem } from '@/lib/books-demo';
import { calculateLayout, normaliseBooks, DEFAULT_CFG, type Book as LayoutBook, type LayoutItem } from '@/layout/ShelfieLayoutEngine';
// Simple fallback color extraction for demo - no external dependencies needed
function getBookColor(coverUrl: string): string {
  // Extract color from the SVG data URL or return a nice fallback
  if (coverUrl.includes('fill=')) {
    const match = coverUrl.match(/fill='%23([^']+)'/);
    if (match) {
      return `#${match[1]}`;
    }
  }
  return '#4a5568'; // Fallback gray
}

interface DemoShelfRealisticProps {
  books: BookDemoItem[];
  reducedMotion?: boolean;
}

// Convert demo book to layout engine format
function convertToLayoutBook(book: BookDemoItem, index: number): LayoutBook {
  return {
    id: `demo-${index}`,
    phys: {
      width_mm: book.w,
      height_mm: book.h,
      spine_mm: book.t
    }
  };
}

// Individual book component using the actual app's book-3d styling
function RealisticBookCard({ 
  book, 
  layoutItem, 
  dominantColor 
}: { 
  book: BookDemoItem; 
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
      data-testid={`demo-book-${book.title.replace(/\s+/g, '-').toLowerCase()}`}
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
            src={book.cover} 
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

export default function DemoShelfRealistic({ books, reducedMotion = false }: DemoShelfRealisticProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [containerWidth, setContainerWidth] = useState(400);
  const [dominantColors, setDominantColors] = useState<Map<string, string>>(new Map());

  // Extract colors from book covers (simplified for demo)
  useEffect(() => {
    const colorMap = new Map<string, string>();
    
    for (const book of books) {
      const color = getBookColor(book.cover);
      colorMap.set(book.title, color);
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

  // Convert demo books to layout engine format and calculate positions
  const layoutItems = useMemo(() => {
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

  const scrollLeft = () => {
    const newPosition = Math.max(0, scrollPosition - containerWidth * 0.7);
    setScrollPosition(newPosition);
  };

  const scrollRight = () => {
    const maxScroll = Math.max(0, contentDimensions.width - containerWidth);
    const newPosition = Math.min(maxScroll, scrollPosition + containerWidth * 0.7);
    setScrollPosition(newPosition);
  };

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
  }, [scrollPosition, containerWidth, contentDimensions.width]);

  const maxScroll = Math.max(0, contentDimensions.width - containerWidth);

  return (
    <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-gray-200 overflow-hidden">
      {/* Navigation buttons */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Your library preview</h3>
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
        className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg border border-gray-200"
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
          aria-label="3D book shelf demonstration with realistic layout engine"
        >
          {layoutItems.map((layoutItem, index) => {
            const book = books[index];
            const dominantColor = dominantColors.get(book.title) || '#4a5568';
            
            return (
              <RealisticBookCard
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
        Scroll to explore the realistic 3D layout engine — exactly as used in the full app
      </p>
    </div>
  );
}