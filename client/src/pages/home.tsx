import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/header";
import BookCard from "@/components/book-card";
import ScannerModal from "@/components/scanner-modal";
import EnhancedBookDetailsModal from "@/components/enhanced-book-details-modal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Book } from "@shared/schema";
import { BookOpen, Camera, Book as BookIcon, Eye, CheckCircle } from "lucide-react";
import { analyzeImageColors, sortBooksByOverallColor } from "@/utils/color-sort";
import { calculateDynamicLayout, BookPosition, LayoutConfig } from "@/utils/dynamic-layout";
import { 
  calculateLayout, 
  normaliseBooks, 
  DEFAULT_CFG,
  type Book as LayoutBook, 
  type LayoutItem, 
  type LayoutConfig as EngineConfig 
} from '@/layout/BookScanLayoutEngine';
import VirtualizedBookGrid from '@/components/virtualized-book-grid';
import { usePerformanceTelemetry } from '@/hooks/usePerformanceTelemetry';
import { useLocation } from "wouter";

type SortOption = 'title-asc' | 'title-desc' | 'author-asc' | 'author-desc' | 'status' | 'date-added' | 'color-light-to-dark' | 'color-dark-to-light';
type FilterStatus = 'all' | 'want-to-read' | 'reading' | 'read';

// Function to sort books by overall visual color profile
async function sortBooksByColor(books: Book[], reverse: boolean = false): Promise<Book[]> {
  // Analyze color profiles for all books
  const booksWithProfiles = await Promise.all(
    books.map(async (book) => {
      let profile = {
        averageLightness: 50,
        dominantHue: 0,
        colorfulness: 50,
        warmth: 0
      };
      
      if (book.coverImage) {
        try {
          profile = await analyzeImageColors(book.coverImage);
        } catch (e) {
          // Use default profile if analysis fails
        }
      }
      
      return { book, profile };
    })
  );

  // Sort by overall visual appeal and color harmony
  return sortBooksByOverallColor(booksWithProfiles, reverse);
}

export default function Home() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-added');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showFilters, setShowFilters] = useState(false);

  const [useVirtualization, setUseVirtualization] = useState(false);
  
  // Performance telemetry
  const { measureLayout, scheduleCommit } = usePerformanceTelemetry();

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: allBooks = [], isLoading: booksLoading, refetch } = useQuery<Book[]>({
    queryKey: ['/api/books'],
  });

  // Filter and sort books based on current state
  const books = useMemo(() => {
    let filtered = allBooks;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(book => 
        book.title.toLowerCase().includes(term) ||
        book.author.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(book => book.status === filterStatus);
    }

    // Handle color sorting separately since it's async
    if (sortBy === 'color-light-to-dark' || sortBy === 'color-dark-to-light') {
      return filtered; // Will be sorted by useEffect below
    }

    // Sort books for other sort options
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'author-asc':
          return a.author.localeCompare(b.author);
        case 'author-desc':
          return b.author.localeCompare(a.author);
        case 'status':
          const statusOrder = { 'reading': 0, 'want-to-read': 1, 'read': 2 };
          return (statusOrder[a.status as keyof typeof statusOrder] || 3) - (statusOrder[b.status as keyof typeof statusOrder] || 3);
        case 'date-added':
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [allBooks, searchTerm, filterStatus, sortBy]);

  // Handle color sorting with state
  const [colorSortedBooks, setColorSortedBooks] = useState<Book[]>([]);
  const [isColorSorting, setIsColorSorting] = useState(false);
  
  // Dynamic layout state
  const [bookPositions, setBookPositions] = useState<BookPosition[]>([]);
  const [layoutItems, setLayoutItems] = useState<LayoutItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [isContainerMeasured, setIsContainerMeasured] = useState(false);
  
  // Container-based responsive configuration
  const [responsiveConfig, setResponsiveConfig] = useState<EngineConfig>({
    ...DEFAULT_CFG,
    raggedLastRow: true
  });

  // Update config when container size or tidy mode changes
  useEffect(() => {
    const width = containerDimensions.width;
    let baseConfig = { ...DEFAULT_CFG };
    
    // Container-query equivalent logic with enhanced scaling for dramatic size differences
    if (width < 480) {
      baseConfig = {
        ...baseConfig,
        targetRowHeight: 180, // Increased from 160
        gutterX: 8,
        gutterY: 12,
        BASE_HEIGHT: 195 // Adjusted for better proportional scaling
      };
    } else if (width < 900) {
      baseConfig = {
        ...baseConfig,
        targetRowHeight: 220, // Increased from 184
        gutterX: 12, // Increased spacing
        gutterY: 14,
        BASE_HEIGHT: 195
      };
    } else {
      baseConfig = {
        ...baseConfig,
        targetRowHeight: 280, // Dramatically increased from 200 to allow coffee table books
        gutterX: 12, // Reduced spacing to fit more books per row
        gutterY: 16, // Reduced vertical spacing
        BASE_HEIGHT: 195 // Optimized for better aspect ratio scaling
      };
    }
    
    setResponsiveConfig({
      ...baseConfig,
      raggedLastRow: true // Always use ragged rows to preserve proportions
    });
  }, [containerDimensions.width]);

  useEffect(() => {
    if ((sortBy === 'color-light-to-dark' || sortBy === 'color-dark-to-light') && books.length > 0) {
      setIsColorSorting(true);
      const reverse = sortBy === 'color-light-to-dark'; // Light-to-Dark needs reverse=true since default is dark-to-light
      sortBooksByColor(books, reverse).then(sorted => {
        setColorSortedBooks(sorted);
        setIsColorSorting(false);
      });
    }
  }, [sortBy, books]);

  // Use color-sorted books when appropriate
  const finalBooks = (sortBy === 'color-light-to-dark' || sortBy === 'color-dark-to-light') ? colorSortedBooks : books;

  // Convert books to layout engine format
  const convertToLayoutBooks = (books: Book[]): LayoutBook[] => {
    return books.map(book => {
      // Debug logging for dimension analysis
      if (book.title.toLowerCase().includes('rolex') || 
          book.title.toLowerCase().includes('innovation') || 
          book.title.toLowerCase().includes('pizza')) {
        console.log(`${book.title} dimensions:`, { 
          title: book.title, 
          width: book.width, 
          height: book.height, 
          depth: book.depth, 
          dimensions: book.dimensions 
        });
      }
      
      let widthInches, heightInches, depthInches;
      
      // Try to use parsed dimensions first (from backend intelligent parsing)
      if (book.width && book.height && book.depth) {
        widthInches = parseFloat(book.width);
        heightInches = parseFloat(book.height);
        depthInches = parseFloat(book.depth);
      } else if (book.dimensions) {
        // Parse dimensions string as fallback
        const parsed = parseRawDimensions(book.dimensions);
        widthInches = parsed.width;
        heightInches = parsed.height;
        depthInches = parsed.depth;
      } else {
        // Default dimensions for typical paperback
        widthInches = 5.5;
        heightInches = 8.5;
        depthInches = 0.75;
      }
      
      const result = {
        id: book.id,
        phys: {
          width_mm: widthInches * 25.4, // Convert inches to mm
          height_mm: heightInches * 25.4,
          spine_mm: depthInches * 25.4
        }
      };
      
      // Debug large books
      if (widthInches > 10 || heightInches > 12) {
        console.log('Large book detected:', { 
          title: book.title, 
          dimensions_inches: { width: widthInches, height: heightInches, depth: depthInches },
          dimensions_mm: result.phys
        });
      }
      
      return result;
    });
  };
  
  // Parse raw dimensions string to inches
  const parseRawDimensions = (dimensionsStr: string): { width: number; height: number; depth: number } => {
    const defaultDims = { width: 5.5, height: 8.5, depth: 0.75 }; // inches
    
    if (!dimensionsStr) return defaultDims;
    
    try {
      const matches = dimensionsStr.match(/([\d.]+)\s*x\s*([\d.]+)\s*x\s*([\d.]+)/i);
      if (!matches) return defaultDims;
      
      let [, dim1Str, dim2Str, dim3Str] = matches;
      let dim1 = parseFloat(dim1Str);
      let dim2 = parseFloat(dim2Str);
      let dim3 = parseFloat(dim3Str);
      
      // Check if dimensions are in centimeters (convert to inches)
      if (dimensionsStr.toLowerCase().includes('cm')) {
        dim1 = dim1 / 2.54; // Convert cm to inches
        dim2 = dim2 / 2.54;
        dim3 = dim3 / 2.54;
      }
      
      // Heuristic to determine width, height, depth from the three dimensions
      const dims = [dim1, dim2, dim3];
      dims.sort((a, b) => a - b);
      const [smallest, middle, largest] = dims;
      
      // Smallest is typically depth/thickness
      let width, height, depth = smallest;
      const remaining = dims.filter(d => d !== smallest);
      
      if (remaining.length === 2) {
        const [smaller, larger] = remaining.sort((a, b) => a - b);
        const aspectRatio = larger / smaller;
        
        if (aspectRatio > 1.4) {
          // Clear portrait orientation
          width = smaller;
          height = larger;
        } else {
          // Landscape or square - for coffee table books, width is often larger
          width = larger;
          height = smaller;
        }
      } else {
        width = middle;
        height = largest;
      }
      
      return { width, height, depth };
    } catch (error) {
      console.warn('Failed to parse dimensions:', dimensionsStr, error);
      return defaultDims;
    }
  };

  // Legacy parseBookDimensions function for display scaling (no longer used)
  const parseBookDimensions = (book: Book): { width: number; height: number; depth: number } => {
    const defaultDimensions = { width: 140, height: 200, depth: 15 };
    
    if (!book.dimensions) return defaultDimensions;
    
    try {
      const matches = book.dimensions.match(/([\d.]+)\s*x\s*([\d.]+)\s*x\s*([\d.]+)/i);
      if (!matches) return defaultDimensions;
      
      let [, dim1Str, dim2Str, dim3Str] = matches;
      let dim1 = parseFloat(dim1Str);
      let dim2 = parseFloat(dim2Str);
      let dim3 = parseFloat(dim3Str);
      
      const dims = [dim1, dim2, dim3];
      dims.sort((a, b) => a - b);
      const [smallest, middle, largest] = dims;
      
      let width, height, depth = smallest;
      const remaining = dims.filter(d => d !== smallest);
      if (remaining.length === 2) {
        const [smaller, larger] = remaining.sort((a, b) => a - b);
        const aspectRatio = larger / smaller;
        
        if (aspectRatio > 1.4) {
          width = smaller;
          height = larger;
        } else {
          width = middle;
          height = largest;
        }
      } else {
        width = middle;
        height = largest;
      }
      
      // Scale dimensions for visual display
      const baseScale = 22;
      return {
        width: Math.round(width * baseScale),
        height: Math.round(height * baseScale),
        depth: Math.max(Math.round(depth * baseScale * 1.2), 10)
      };
    } catch (error) {
      console.warn('Failed to parse book dimensions:', book.dimensions, error);
      return defaultDimensions;
    }
  };

  // Memoized book normalization
  const normalizedDimensions = useMemo(() => {
    const layoutBooks = convertToLayoutBooks(finalBooks);
    return normaliseBooks(layoutBooks, responsiveConfig.BASE_HEIGHT);
  }, [finalBooks, responsiveConfig.BASE_HEIGHT]);

  // Memoized layout calculation using new engine with performance measurement
  const newLayoutItems = useMemo(() => {
    // Only use measured width to ensure consistent centering - wait for measurement if needed
    if (finalBooks.length === 0) {
      return [];
    }
    
    // For small screens (mobile), use a more conservative fallback to prevent overflow
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const conservativeFallback = Math.min(screenWidth - 40, 800); // Account for mobile padding
    
    const effectiveWidth = isContainerMeasured && containerDimensions.width > 0 
      ? containerDimensions.width 
      : conservativeFallback;
    
    console.log('Layout calculation:', { 
      booksCount: finalBooks.length, 
      containerMeasured: isContainerMeasured, 
      containerWidth: containerDimensions.width,
      effectiveWidth,
      screenWidth
    });
    
    const layoutBooks = convertToLayoutBooks(finalBooks);
    return measureLayout(
      () => calculateLayout(layoutBooks, normalizedDimensions, effectiveWidth, responsiveConfig),
      finalBooks.length,
      'BookScan Layout Engine'
    );
  }, [finalBooks, normalizedDimensions, containerDimensions.width, responsiveConfig.targetRowHeight, responsiveConfig.gutterX, responsiveConfig.gutterY, responsiveConfig.raggedLastRow, measureLayout, isContainerMeasured]);

  // Legacy dimension calculation (no longer used with new layout engine)
  // Kept for reference but replaced by the headless layout engine

  // Container resize observer with ResizeObserver
  useEffect(() => {
    console.log('Setting up container measurement effect');
    
    const updateContainerSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const parentElement = containerRef.current.parentElement;
        const parentRect = parentElement?.getBoundingClientRect();
        
        // Try multiple fallback measurements
        let newWidth = rect.width;
        if (!newWidth && parentRect) {
          newWidth = parentRect.width - 48; // Account for padding
        }
        if (!newWidth) {
          newWidth = window.innerWidth - 100; // Fallback to window width with margin
        }
        if (!newWidth) {
          newWidth = 1200; // Last resort fallback
        }
        
        const newHeight = Math.max(rect.height, 600);
        
        console.log('Container size updated:', { 
          width: newWidth, 
          height: newHeight, 
          rectWidth: rect.width,
          parentWidth: parentRect?.width,
          windowWidth: window.innerWidth
        });
        setContainerDimensions({ width: newWidth, height: newHeight });
        setIsContainerMeasured(true);
      } else {
        console.log('Container ref not available, using fallback dimensions');
        // If container ref isn't available, use window-based fallback
        const fallbackWidth = window.innerWidth - 100;
        setContainerDimensions({ width: fallbackWidth, height: 600 });
        setIsContainerMeasured(true);
      }
    };

    // Multiple attempts to measure container with increasing delays
    const attemptMeasurement = (attempt = 0) => {
      if (attempt > 5) return; // Give up after 5 attempts
      
      updateContainerSize();
      
      // If container still has no width, try again with exponential backoff
      if (containerRef.current && containerRef.current.getBoundingClientRect().width === 0) {
        const delay = Math.min(50 * Math.pow(2, attempt), 1000); // 50ms, 100ms, 200ms, 400ms, 800ms, 1000ms
        setTimeout(() => {
          attemptMeasurement(attempt + 1);
        }, delay);
      }
    };

    // Start measurement attempts immediately and with delays
    attemptMeasurement();
    
    // Also try after guaranteed delays for React rendering
    setTimeout(attemptMeasurement, 100);
    setTimeout(attemptMeasurement, 300);
    
    // Use ResizeObserver for better performance
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const newWidth = Math.max(width || 1200, 300); // Ensure minimum width
        const newHeight = Math.max(height, 600);
        
        console.log('ResizeObserver update:', { width: newWidth, height: newHeight });
        setContainerDimensions({ width: newWidth, height: newHeight });
        setIsContainerMeasured(true);
      }
    });

    // Set up observer with a slight delay to ensure DOM is ready
    const setupObserver = () => {
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }
    };
    
    setupObserver();
    setTimeout(setupObserver, 50); // Retry observer setup

    // Fallback for window resize
    window.addEventListener('resize', updateContainerSize);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateContainerSize);
    };
  }, []); // Only run once on mount

  // Update layout items state when new layout is calculated
  useEffect(() => {
    setLayoutItems(newLayoutItems);
    // Enable virtualization for large libraries (>1000 books)
    setUseVirtualization(newLayoutItems.length > 1000);
  }, [newLayoutItems]);


  
  const refreshAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/books/refresh-all', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh books');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Navigate to progress page if redirect URL is provided
      if (data.redirectTo) {
        setLocation(data.redirectTo);
      } else {
        // Fallback to old behavior
        queryClient.invalidateQueries({ queryKey: ["/api/books"] });
        toast({
          title: "Success",
          description: data.message || "All books have been refreshed with latest data",
        });
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to refresh books. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleBookSelect = (book: Book) => {
    setSelectedBook(book);
  };

  const handleScannerClose = () => {
    setIsScannerOpen(false);
    refetch(); // Refresh books list after scanning
  };

  const handleBookUpdate = () => {
    refetch(); // Refresh books list after update
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden relative">
      <Header 
          booksCount={allBooks.length}
          filteredCount={finalBooks.length}
          onRefreshAll={() => refreshAllMutation.mutate()}
          isRefreshing={refreshAllMutation.isPending}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sortBy={sortBy}
          onSortChange={setSortBy}
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
        />
        
        <main className="w-full px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto py-6 sm:py-12">
        {/* Hero Section */}
        <div className="mb-8 sm:mb-12 text-center">
          <h2 className="text-2xl sm:text-4xl font-bold text-monochrome-black mb-2 sm:mb-4 tracking-tight leading-tight">Your Digital Library</h2>
          <p className="text-sm sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed mb-4 sm:mb-8 px-2">
            Scan barcodes to instantly add books to your collection. Browse, organize, and discover your reading journey.
          </p>
          
          {/* Horizontal Tracker Bar */}
          {finalBooks.length > 0 && (
            <div className="inline-flex items-center gap-4 sm:gap-8 bg-white rounded-full px-4 sm:px-8 py-3 sm:py-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-1 sm:gap-2 text-gray-700">
                <BookIcon className="w-4 h-4 sm:w-5 sm:h-5 text-coral-red" />
                <span className="font-semibold text-base sm:text-lg">{finalBooks.length}</span>
                <span className="text-xs sm:text-sm text-gray-500">books</span>
              </div>
              <div className="w-px h-4 sm:h-6 bg-gray-200" />
              <div className="flex items-center gap-1 sm:gap-2 text-gray-700">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                <span className="font-semibold text-base sm:text-lg">{finalBooks.filter(b => b.status === 'read').length}</span>
                <span className="text-xs sm:text-sm text-gray-500">read</span>
              </div>
              <div className="w-px h-4 sm:h-6 bg-gray-200" />
              <div className="flex items-center gap-1 sm:gap-2 text-gray-700">
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-sky-blue" />
                <span className="font-semibold text-base sm:text-lg">{finalBooks.filter(b => b.status === 'reading').length}</span>
                <span className="text-xs sm:text-sm text-gray-500">reading</span>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Books Layout */}
        {booksLoading || ((sortBy === 'color-light-to-dark' || sortBy === 'color-dark-to-light') && isColorSorting) || (finalBooks.length > 0 && newLayoutItems.length === 0) ? (
          <div className="relative min-h-96" style={{ minHeight: '400px' }}>
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className="absolute group"
                style={{
                  left: `${(i % 4) * 200 + 40}px`,
                  top: `${Math.floor(i / 4) * 250 + 40}px`,
                  transform: `rotate(${((i * 13) % 7 - 3)}deg)` // Deterministic rotation for loading state
                }}
              >
                <div className="relative w-36 h-48 bg-gray-200 rounded-lg mb-2 animate-pulse" />
              </div>
            ))}
          </div>
        ) : finalBooks.length > 0 ? (
          useVirtualization ? (
            <VirtualizedBookGrid
              layoutItems={newLayoutItems}
              books={finalBooks}
              onBookSelect={handleBookSelect}
              onBookUpdate={handleBookUpdate}
              chunkSize={200}
              bufferSize={2}
            />
          ) : (
            <div 
              ref={containerRef}
              className="gridContainer relative w-full" 
              style={{ 
                containerType: 'inline-size',
                minHeight: `${Math.max(400, newLayoutItems.reduce((max, item) => Math.max(max, item.y + item.h + 40), 400))}px`,
                '--rowH': `${responsiveConfig.targetRowHeight}px`,
                '--gutterX': `${responsiveConfig.gutterX}px`,
                '--gutterY': `${responsiveConfig.gutterY}px`
              } as React.CSSProperties}
              data-testid="books-layout"
            >
              {newLayoutItems.map((item) => {
                const book = finalBooks.find(b => b.id === item.id);
                if (!book) return null;
                
                return (
                  <div
                    key={item.id}
                    className="absolute"
                    style={{
                      left: `${item.x}px`,
                      top: `${item.y}px`,
                      zIndex: Math.round(item.z * 100),
                      transform: `rotateY(${item.ry}deg)`,
                      width: `${item.w}px`,
                      height: `${item.h}px`,
                      transition: 'transform 220ms cubic-bezier(.2,.8,.2,1)',
                      willChange: 'transform'
                    }}
                  >
                    <BookCard
                      book={book}
                      onSelect={handleBookSelect}
                      onUpdate={handleBookUpdate}
                      customDimensions={{
                        width: item.w,
                        height: item.h,
                        depth: item.d
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Empty State */
          <div className="text-center py-20" data-testid="empty-state">
            <div className="mb-10">
              <BookOpen className="w-20 h-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Build Your Digital Bookshelf</h3>
              <p className="text-gray-600 max-w-lg mx-auto text-lg leading-relaxed">
                Start your reading journey by scanning book barcodes. Watch your personal library come to life.
              </p>
            </div>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="inline-flex items-center px-8 py-4 bg-coral-red hover:bg-red-600 text-white font-semibold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              data-testid="button-scan-first-book"
            >
              <Camera className="w-6 h-6 mr-3" />
              Scan Your First Book
            </button>
          </div>
        )}
        </main>

      {/* Floating Action Button */}
      {finalBooks.length > 0 && (
        <button
          onClick={() => setIsScannerOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 bg-coral-red hover:bg-red-600 text-white p-3 sm:p-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 z-[9997]"
          data-testid="button-floating-scan"
        >
          <Camera className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
      )}

      {/* Modals */}
      <ScannerModal 
        isOpen={isScannerOpen} 
        onClose={handleScannerClose}
      />
      
      <EnhancedBookDetailsModal
        book={selectedBook}
        isOpen={!!selectedBook}
        onClose={() => setSelectedBook(null)}
        onUpdate={handleBookUpdate}
      />
    </div>
  );
}
