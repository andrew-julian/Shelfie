import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookDemoItem } from "@/lib/books-demo";

interface DemoShelfProps {
  books: BookDemoItem[];
  reducedMotion?: boolean;
}

export default function DemoShelf({ books, reducedMotion = false }: DemoShelfProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      setContainerWidth(window.innerWidth);
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Viewport-aware scale factor
  const getScaleFactor = () => {
    if (containerWidth < 640) return 0.45; // mobile
    if (containerWidth < 1024) return 0.6; // tablet
    return 0.8; // desktop
  };

  const scaleFactor = getScaleFactor();

  const scrollLeft = () => {
    setScrollPosition(prev => Math.max(0, prev - 200));
  };

  const scrollRight = () => {
    setScrollPosition(prev => prev + 200);
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
  }, []);

  return (
    <div className="relative bg-gradient-to-b from-amber-50 to-amber-100 rounded-2xl p-8 overflow-hidden">
      {/* Shelf background */}
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-amber-200 to-amber-300 rounded-b-2xl" />
      
      {/* Navigation buttons */}
      <div className="flex justify-between items-center mb-6">
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
            aria-label="Scroll books right"
            data-testid="button-scroll-right"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Books container */}
      <div 
        className="relative overflow-hidden"
        style={{ height: `${Math.max(...books.map(book => book.h)) * scaleFactor + 40}px` }}
      >
        <div 
          className="flex transition-transform duration-300 ease-out"
          style={{ 
            transform: `translateX(-${scrollPosition}px)`,
            gap: `clamp(8px, 2vw, 24px)`
          }}
          role="region"
          aria-live="polite"
          aria-label="3D book shelf demonstration"
        >
          {books.map((book, index) => {
            const width = book.w * scaleFactor;
            const height = book.h * scaleFactor;
            const thickness = Math.max(book.t * scaleFactor, 3);

            return (
              <div
                key={index}
                className="relative flex-shrink-0 group cursor-pointer"
                style={{ 
                  width: `${width}px`,
                  height: `${height}px`,
                  marginBottom: '20px'
                }}
                title={`${book.title} by ${book.author}`}
                data-testid={`book-${index}`}
              >
                {/* Book spine/3D effect */}
                {!reducedMotion && (
                  <div
                    className="absolute inset-0 bg-gray-400 rounded-r-sm transform origin-left"
                    style={{
                      transform: `rotateY(-15deg) translateZ(${thickness/2}px)`,
                      width: `${thickness}px`,
                      left: `${width - thickness}px`,
                      boxShadow: `inset -2px 0 4px rgba(0,0,0,0.3)`
                    }}
                  />
                )}
                
                {/* Book cover */}
                <div
                  className={`relative rounded-sm overflow-hidden shadow-lg transition-transform duration-200 ${
                    !reducedMotion ? 'group-hover:scale-105 group-hover:-translate-y-1' : ''
                  }`}
                  style={{
                    width: `${width}px`,
                    height: `${height}px`,
                    boxShadow: `${thickness/4}px ${thickness/4}px ${thickness/2}px rgba(0,0,0,0.3)`
                  }}
                >
                  <img
                    src={book.cover}
                    alt={`Cover of ${book.title} by ${book.author}`}
                    className="w-full h-full object-cover"
                    style={{ aspectRatio: `${book.w}/${book.h}` }}
                    loading="lazy"
                  />
                  
                  {/* Subtle highlight overlay */}
                  {!reducedMotion && (
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  )}
                </div>

                {/* Tooltip on hover */}
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  {book.title}
                  <div className="text-gray-300">{book.author}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subtle hint text */}
      <p className="text-sm text-gray-600 text-center mt-4">
        Scroll to see how books display with realistic proportions
      </p>
    </div>
  );
}