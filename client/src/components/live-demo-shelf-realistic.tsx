import { useState, useEffect, useMemo } from 'react';
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

// Utility to parse book dimensions - EXACT same logic as main app
function parseBookDimensions(book: Book): { width: number; height: number; depth: number } {
  const defaultDimensions = { width: 140, height: 200, depth: 15 };
  
  // Use parsed dimensions if available (from backend intelligent parsing)
  if (book.width && book.height && book.depth) {
    const width = parseFloat(book.width);
    const height = parseFloat(book.height);
    const depth = parseFloat(book.depth);
    
    // Scale dimensions for visual display (22px per inch base scale)
    const baseScale = 22;
    
    return {
      width: Math.round(width * baseScale),
      height: Math.round(height * baseScale),
      depth: Math.max(Math.round(depth * baseScale * 1.2), 10) // More realistic depth effect
    };
  }
  
  // Fallback to parsing dimensions string for backwards compatibility
  if (!book.dimensions) return defaultDimensions;
  
  try {
    // Parse various dimension formats like "8.5 x 5.5 x 1.2 inches", "21.6 x 14 x 2.8 cm", etc.
    const matches = book.dimensions.match(/([\d.]+)\s*x\s*([\d.]+)\s*x\s*([\d.]+)/i);
    if (!matches) return defaultDimensions;
    
    let [, dim1Str, dim2Str, dim3Str] = matches;
    let dim1 = parseFloat(dim1Str);
    let dim2 = parseFloat(dim2Str);
    let dim3 = parseFloat(dim3Str);
    
    // Amazon provides dimensions in various orders. For books, we need to intelligently
    // determine which dimension represents width, height, and depth (thickness).
    // Books are typically: portrait orientation (height > width) and relatively thin
    
    const dims = [dim1, dim2, dim3];
    dims.sort((a, b) => a - b);
    const [smallest, middle, largest] = dims;
    
    // Heuristic: smallest dimension is usually depth (thickness)
    // The two larger dimensions represent width and height
    let width, height, depth = smallest;
    
    // Between the remaining two dimensions, height should be larger for portrait books
    const remaining = dims.filter(d => d !== smallest);
    if (remaining.length === 2) {
      const [smaller, larger] = remaining.sort((a, b) => a - b);
      
      // For typical books, assume portrait orientation unless dimensions suggest otherwise
      // Very wide books (like coffee table books) might be landscape
      const aspectRatio = larger / smaller;
      
      if (aspectRatio > 1.4) {
        // Clear portrait book
        width = smaller;
        height = larger;
      } else if (aspectRatio < 1.2) {
        // Nearly square, keep original order preference
        width = middle;
        height = largest;
      } else {
        // Ambiguous case - use the larger dimension as height for portrait assumption
        width = smaller;
        height = larger;
      }
    } else {
      // Fallback if sorting logic fails
      width = middle;
      height = largest;
    }
    
    // Check if units are explicitly mentioned, then convert appropriately
    const isMetric = /cm|centimeter|millimeter/i.test(book.dimensions);
    const isImperial = /inch|inches|in\b/i.test(book.dimensions);
    
    // Convert to inches if needed
    if (isMetric || (!isImperial && (width > 15 || height > 15 || depth > 15))) {
      width = width / 2.54; // cm to inches
      height = height / 2.54;
      depth = depth / 2.54;
    }
    
    // More realistic scaling - typical paperback is about 4.25" x 6.87" = 120x190px
    // So roughly 28px per inch, but adjust for better visual balance
    const baseScale = 22;
    
    return {
      width: Math.round(width * baseScale),
      height: Math.round(height * baseScale), 
      depth: Math.max(Math.round(depth * baseScale * 1.2), 10) // More realistic depth effect
    };
  } catch (error) {
    console.warn('Failed to parse book dimensions:', book.dimensions, error);
    return defaultDimensions;
  }
}

// Convert database book to layout engine format - using EXACT same logic as main app
function convertToLayoutBook(book: Book, index: number): LayoutBook {
  // Use the exact same dimension parsing as the main app
  const dims = parseBookDimensions(book);
  
  // Convert from pixels to millimeters (layout engine expects mm)
  // The main app uses 22px per inch, so: px / 22 * 25.4 = mm
  const pxToMm = 25.4 / 22;
  
  return {
    id: book.id,
    phys: { 
      width_mm: dims.width * pxToMm,
      height_mm: dims.height * pxToMm,
      spine_mm: dims.depth * pxToMm
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
              ? 'rotateY(0deg) translateZ(8px) scale(1.05)' 
              : 'rotateY(-25deg) translateZ(1px)',
            transition: 'transform 320ms cubic-bezier(.2,.8,.2,1)',
            margin: 0,
            boxSizing: 'border-box',
            boxShadow: isHovered
              ? '0 12px 25px rgba(0,0,0,.25), 0 40px 60px -20px rgba(0,0,0,.45)'
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
  const [containerWidth, setContainerWidth] = useState(800);
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
      setContainerWidth(Math.min(800, window.innerWidth - 48)); // Max 800px with padding
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
    
    // Use settings that match the main app proportions more closely
    const demoConfig = {
      ...DEFAULT_CFG,
      targetRowHeight: 200, // Larger to match natural book proportions like main app
      gutterX: 12,
      gutterY: 15,
      jitterX: 8,
      maxTiltY: 8,
      raggedLastRow: true // Allow natural organic endings
    };
    
    return calculateLayout(layoutBooks, normalizedDims, containerWidth, demoConfig);
  }, [books, containerWidth]);

  // Calculate total content dimensions
  const contentDimensions = useMemo(() => {
    if (layoutItems.length === 0) return { width: containerWidth, height: 300 };
    
    const maxX = Math.max(...layoutItems.map(item => item.x + item.w));
    const maxY = Math.max(...layoutItems.map(item => item.y + item.h));
    
    return {
      width: Math.max(maxX + 40, containerWidth),
      height: maxY + 40
    };
  }, [layoutItems, containerWidth]);

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-gray-500 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
          <p className="text-sm">Loading real books...</p>
        </div>
      </div>
    );
  }

  if (isError || !books.length) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-gray-500 text-center">
          <p>Unable to load demo books</p>
          <p className="text-sm">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Pure books display without any containers */}
      <div 
        className="relative"
        style={{ 
          height: `${contentDimensions.height}px`,
          width: '100%',
          perspective: '1200px',
          perspectiveOrigin: 'center center'
        }}
      >
        <div 
          className="relative w-full h-full"
          style={{ 
            width: `${contentDimensions.width}px`,
            height: `${contentDimensions.height}px`,
            transformStyle: 'preserve-3d'
          }}
          role="region"
          aria-live="polite"
          aria-label="Live 3D book display with real user books"
        >
          {layoutItems.map((layoutItem, index) => {
            const book = books[index];
            const dominantColor = dominantColors.get(book.id) || '#4a5568';
            
            return (
              <LiveBookCard
                key={book.id}
                book={book}
                layoutItem={layoutItem}
                dominantColor={dominantColor}
              />
            );
          })}
        </div>
      </div>

      {/* Subtle hint text */}
      <div className="text-center mt-6">
        <p className="text-sm text-gray-500 italic">Real books from an actual Shelfie library — scroll to explore the 3D shelf</p>
      </div>
    </div>
  );
}