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

  // More realistic scale factor to match app presentation
  const getScaleFactor = () => {
    if (containerWidth < 640) return 0.35; // mobile - smaller
    if (containerWidth < 1024) return 0.4; // tablet - smaller
    return 0.5; // desktop - smaller for more realistic feel
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
            aria-label="Scroll books right"
            data-testid="button-scroll-right"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Books container with more realistic styling */}
      <div 
        className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg p-4"
        style={{ height: `${Math.max(...books.map(book => book.h)) * scaleFactor + 30}px` }}
      >
        <div 
          className="flex items-end transition-transform duration-300 ease-out"
          style={{ 
            transform: `translateX(-${scrollPosition}px)`,
            gap: `${Math.max(4, scaleFactor * 8)}px`
          }}
          role="region"
          aria-live="polite"
          aria-label="3D book shelf demonstration"
        >
          {books.map((book, index) => {
            const width = book.w * scaleFactor;
            const height = book.h * scaleFactor;
            const thickness = Math.max(book.t * scaleFactor, 2);

            return (
              <div
                key={index}
                className="relative flex-shrink-0 group cursor-pointer perspective-1000"
                style={{ 
                  width: `${width}px`,
                  height: `${height}px`
                }}
                title={`${book.title} by ${book.author}`}
                data-testid={`book-${index}`}
              >
                {/* 3D Book Container */}
                <div className="relative preserve-3d transform-gpu">
                  {/* Book spine - more realistic 3D effect */}
                  {!reducedMotion && thickness > 3 && (
                    <div
                      className="absolute bg-gradient-to-r from-gray-600 to-gray-700 rounded-r-sm"
                      style={{
                        transform: `rotateY(-12deg) translateZ(${thickness/2}px)`,
                        width: `${thickness}px`,
                        height: `${height}px`,
                        left: `${width - thickness/2}px`,
                        boxShadow: `inset -1px 0 2px rgba(0,0,0,0.4), 2px 0 6px rgba(0,0,0,0.2)`,
                        background: `linear-gradient(to right, #4a5568, #2d3748)`
                      }}
                    />
                  )}
                  
                  {/* Book cover with enhanced 3D styling */}
                  <div
                    className={`relative rounded-sm overflow-hidden transition-all duration-200 ${
                      !reducedMotion ? 'group-hover:scale-[1.02] group-hover:-translate-y-1 group-hover:rotate-y-2' : ''
                    }`}
                    style={{
                      width: `${width}px`,
                      height: `${height}px`,
                      boxShadow: `
                        0 2px 4px rgba(0,0,0,0.1),
                        0 4px 8px rgba(0,0,0,0.1),
                        0 8px 16px rgba(0,0,0,0.1),
                        ${thickness}px ${thickness}px ${thickness * 2}px rgba(0,0,0,0.15)
                      `,
                      transform: !reducedMotion ? 'rotateY(-2deg) rotateX(1deg)' : 'none'
                    }}
                  >
                    <img
                      src={book.cover}
                      alt={`Cover of ${book.title} by ${book.author}`}
                      className="w-full h-full object-cover"
                      style={{ aspectRatio: `${book.w}/${book.h}` }}
                      loading="lazy"
                    />
                    
                    {/* Paper texture overlay */}
                    <div 
                      className="absolute inset-0 opacity-20 mix-blend-multiply"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23000' fill-opacity='0.1' d='m0,0h2v2h-2zm2,2h2v2h-2z'/%3E%3C/svg%3E")`
                      }}
                    />
                    
                    {/* Subtle gradient for depth */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10 pointer-events-none" />
                    
                    {/* Highlight on hover */}
                    {!reducedMotion && (
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    )}
                  </div>

                  {/* Enhanced tooltip */}
                  <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-900/95 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-20 shadow-lg">
                    <div className="font-medium">{book.title}</div>
                    <div className="text-gray-300 text-xs">{book.author}</div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900/95"></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subtle hint text */}
      <p className="text-sm text-gray-600 text-center mt-4 italic">
        Scroll to see how books display with realistic proportions — just like in the app
      </p>
    </div>
  );
}