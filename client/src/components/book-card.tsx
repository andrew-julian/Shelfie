import { useState, useEffect, useRef, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Book } from "@shared/schema";
import { BookOpen, Eye } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCachedDominantColor } from "@/utils/color-extractor";

// Utility to parse book dimensions and convert to CSS dimensions
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

// Calculate aspect ratio constraints for realistic proportions
function constrainBookDimensions(dims: { width: number; height: number; depth: number }) {
  // Mobile-responsive scaling that maintains proportions
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  
  if (isMobile) {
    // On mobile, scale down proportionally but maintain relative sizes
    const mobileScale = 0.75;
    const scaledWidth = dims.width * mobileScale;
    const scaledHeight = dims.height * mobileScale;
    const scaledDepth = dims.depth * mobileScale;
    
    // Apply minimal constraints only to prevent unusably small books
    return {
      width: Math.max(70, scaledWidth),
      height: Math.max(95, scaledHeight),
      depth: Math.max(8, scaledDepth)
    };
  } else {
    // Desktop constraints - more liberal to show variety
    return {
      width: Math.max(90, Math.min(200, dims.width)),
      height: Math.max(130, Math.min(260, dims.height)),
      depth: Math.max(8, Math.min(50, dims.depth))
    };
  }
}




interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onUpdate: () => void;
  onPreview?: (book: Book) => void;
  customDimensions?: {
    width: number;
    height: number;
    depth: number;
  };
}

const statusConfig = {
  'want-to-read': { label: 'Want', icon: '📚', color: 'bg-gray-500' },
  'reading': { label: 'Reading', icon: '👀', color: 'bg-sky-blue' },
  'read': { label: 'Read', icon: '✅', color: 'bg-green-500' },
};

export default function BookCard({ book, onSelect, onUpdate, onPreview, customDimensions }: BookCardProps) {
  const { toast } = useToast();
  
  // Use custom dimensions if provided, otherwise calculate responsive dimensions
  const bookDimensions = useMemo(() => {
    if (customDimensions) {
      return {
        width: Math.round(customDimensions.width),
        height: Math.round(customDimensions.height),
        depth: Math.max(Math.round(customDimensions.depth), 8)
      };
    }
    
    // Fallback: use the existing dimension calculation
    const rawDimensions = parseBookDimensions(book);
    return constrainBookDimensions(rawDimensions);
  }, [book, customDimensions]);
  
  // State to track if user is scrolling vs intentionally interacting
  const [isScrolling, setIsScrolling] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState<{x: number, y: number} | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  


  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await fetch(`/api/books/${book.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update book status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      onUpdate();
      toast({
        title: "Success",
        description: "Book status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update book status",
        variant: "destructive",
      });
    },
  });

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = Object.keys(statusConfig).indexOf(book.status);
    const nextStatus = Object.keys(statusConfig)[(currentIndex + 1) % 3];
    updateStatusMutation.mutate(nextStatus);
  };

  const statusInfo = statusConfig[book.status as keyof typeof statusConfig] || statusConfig['want-to-read'];

  const [coverColor, setCoverColor] = useState('#2d3748');

  // Extract dominant color from book cover
  useEffect(() => {
    if (book.coverImage) {
      getCachedDominantColor(book.coverImage)
        .then(color => setCoverColor(color))
        .catch(() => setCoverColor('#2d3748'));
    } else {
      setCoverColor('#4a5568'); // Default for books without covers
    }
  }, [book.coverImage]);

  // Touch event handlers to detect scrolling vs intentional interaction
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setIsScrolling(false);
    
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.y);
    
    // If user moved more than 10px in any direction, consider it scrolling
    if (deltaX > 10 || deltaY > 10) {
      setIsScrolling(true);
    }
  };

  const handleTouchEnd = () => {
    // Add a small delay before resetting scroll state to prevent hover effects during scroll
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      setTouchStartPos(null);
    }, 150);
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPreview) {
      onPreview(book);
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);



  return (
    <div 
      className="group relative"
      onMouseEnter={() => !isScrolling && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className={`book-3d cursor-pointer ${isScrolling ? 'no-hover' : ''}`}
        onClick={() => onSelect(book)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-testid={`card-book-${book.id}`}
        style={{
          '--book-thickness': `${bookDimensions.depth * 0.4}px`,
          '--cover-color': coverColor,
          width: `${bookDimensions.width}px`,
          height: `${bookDimensions.height}px`
        } as React.CSSProperties}
      >
        <div className="book-3d__inner">
          {book.coverImage ? (
            <img 
              className="book-3d__cover"
              src={book.coverImage} 
              alt={`${book.title} book cover`}
              style={{
                width: `${bookDimensions.width}px`,
                height: `${bookDimensions.height}px`
              }}
            />
          ) : (
            <div 
              className="book-3d__placeholder"
              style={{
                width: `${bookDimensions.width}px`,
                height: `${bookDimensions.height}px`
              }}
            >
              <BookOpen className="w-10 h-10 mb-2" />
              <span className="text-xs font-medium text-center px-2 leading-tight">{book.title}</span>
            </div>
          )}
        </div>
        
        {/* Preview overlay - only show on hover and if onPreview is provided */}
        {isHovered && onPreview && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto">
            <button
              onClick={handlePreviewClick}
              className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              data-testid="button-preview-book"
              aria-label={`Preview ${book.title}`}
            >
              <Eye className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
