import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Book } from "@shared/schema";
import { BookOpen } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
      depth: Math.max(Math.round(depth * baseScale * 0.7), 10) // Slightly thicker depth effect
    };
  }
  
  // Fallback to parsing dimensions string for backwards compatibility
  if (!book.dimensions) return defaultDimensions;
  
  try {
    // Parse various dimension formats like "8.5 x 5.5 x 1.2 inches", "21.6 x 14 x 2.8 cm", etc.
    const matches = book.dimensions.match(/([\d.]+)\s*x\s*([\d.]+)\s*x\s*([\d.]+)/i);
    if (!matches) return defaultDimensions;
    
    let [, widthStr, depthStr, heightStr] = matches;
    let width = parseFloat(widthStr);
    let depth = parseFloat(depthStr);
    let height = parseFloat(heightStr);
    
    // Convert to inches if needed (assuming cm if > 15)
    if (width > 15) {
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
      depth: Math.max(Math.round(depth * baseScale * 0.7), 10) // Slightly thicker depth effect
    };
  } catch (error) {
    console.warn('Failed to parse book dimensions:', book.dimensions, error);
    return defaultDimensions;
  }
}

// Calculate aspect ratio constraints for realistic proportions
function constrainBookDimensions(dims: { width: number; height: number; depth: number }) {
  // More reasonable book size constraints
  const minWidth = 90;   // Very narrow books
  const maxWidth = 200;  // Wide textbooks
  const minHeight = 130; // Short books
  const maxHeight = 260; // Tall books
  const minDepth = 8;    // Thin books
  const maxDepth = 30;   // Very thick books
  
  return {
    width: Math.max(minWidth, Math.min(maxWidth, dims.width)),
    height: Math.max(minHeight, Math.min(maxHeight, dims.height)),
    depth: Math.max(minDepth, Math.min(maxDepth, dims.depth))
  };
}

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onUpdate: () => void;
}

const statusConfig = {
  'want-to-read': { label: 'Want', icon: '📚', color: 'bg-gray-500' },
  'reading': { label: 'Reading', icon: '👀', color: 'bg-sky-blue' },
  'read': { label: 'Read', icon: '✅', color: 'bg-green-500' },
};

export default function BookCard({ book, onSelect, onUpdate }: BookCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { toast } = useToast();
  
  // Calculate book dimensions based on real-world data
  const rawDimensions = parseBookDimensions(book);
  const bookDimensions = constrainBookDimensions(rawDimensions);

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

  return (
    <div className="group relative">
      <div 
        className="book-container cursor-pointer"
        onClick={() => onSelect(book)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-testid={`card-book-${book.id}`}
      >
        <div 
          className="book"
          style={{
            width: `${bookDimensions.width}px`,
            height: `${bookDimensions.height}px`
          }}
        >
          {/* Book Cover */}
          {book.coverImage ? (
            <img 
              src={book.coverImage} 
              alt={`${book.title} book cover`}
              style={{
                width: `${bookDimensions.width}px`,
                height: `${bookDimensions.height}px`
              }}
            />
          ) : (
            <div 
              className="bg-gradient-to-br from-gray-300 to-gray-400 flex flex-col items-center justify-center text-white"
              style={{
                width: `${bookDimensions.width}px`,
                height: `${bookDimensions.height}px`
              }}
            >
              <BookOpen className="w-10 h-10 mb-2" />
              <span className="text-xs font-medium text-center px-2 leading-tight">{book.title}</span>
            </div>
          )}
          
          {/* White Spine */}
          <div 
            className="book-spine"
            style={{
              width: `${bookDimensions.depth * 1.8}px`,
              height: `${bookDimensions.height - 2}px`,
              transform: `translateX(${bookDimensions.width - 1}px) rotateY(90deg)`
            }}
          />
        </div>
        
        {/* Status Tag */}
        <button
          onClick={handleStatusClick}
          className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full text-white font-bold text-sm ${statusInfo.color} hover:scale-110 transition-all duration-200 shadow-lg flex items-center justify-center z-10`}
          disabled={updateStatusMutation.isPending}
          title={statusInfo.label}
          data-testid={`button-status-${book.id}`}
        >
          {updateStatusMutation.isPending ? '⏳' : statusInfo.icon}
        </button>
      </div>
      
      {/* Title overlay on hover */}
      <div className={`absolute -bottom-8 left-0 right-0 text-center transform transition-all duration-300 ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
        <h3 className="font-bold text-monochrome-black text-sm line-clamp-2 leading-tight mb-1" data-testid={`text-book-title-${book.id}`}>
          {book.title}
        </h3>
        <p className="text-gray-600 text-xs font-medium" data-testid={`text-book-author-${book.id}`}>
          {book.author === 'Unknown Author' ? 'Author unknown' : book.author}
        </p>
      </div>
    </div>
  );
}
