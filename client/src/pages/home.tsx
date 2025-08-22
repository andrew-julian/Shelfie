import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/header";
import BookCard from "@/components/book-card";
import ScannerModal from "@/components/scanner-modal";
import BookDetailsModal from "@/components/book-details-modal";
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
  const [tidyMode, setTidyMode] = useState(false);
  const [useVirtualization, setUseVirtualization] = useState(false);
  
  // Performance telemetry
  const { measureLayout, scheduleCommit } = usePerformanceTelemetry();

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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
  const [containerDimensions, setContainerDimensions] = useState({ width: 1200, height: 800 });
  
  // Container-based responsive configuration
  const [responsiveConfig, setResponsiveConfig] = useState<EngineConfig>({
    ...DEFAULT_CFG,
    raggedLastRow: !tidyMode
  });

  // Update config when container size or tidy mode changes
  useEffect(() => {
    const width = containerDimensions.width;
    let baseConfig = { ...DEFAULT_CFG };
    
    // Container-query equivalent logic
    if (width < 480) {
      baseConfig = {
        ...baseConfig,
        targetRowHeight: 160,
        gutterX: 8,
        gutterY: 12
      };
    } else if (width < 900) {
      baseConfig = {
        ...baseConfig,
        targetRowHeight: 184,
        gutterX: 10,
        gutterY: 12
      };
    } else {
      baseConfig = {
        ...baseConfig,
        targetRowHeight: 200,
        gutterX: 12,
        gutterY: 14
      };
    }
    
    setResponsiveConfig({
      ...baseConfig,
      raggedLastRow: !tidyMode
    });
  }, [containerDimensions.width, tidyMode]);

  useEffect(() => {
    if ((sortBy === 'color-light-to-dark' || sortBy === 'color-dark-to-light') && books.length > 0) {
      setIsColorSorting(true);
      const reverse = sortBy === 'color-dark-to-light';
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
    return books.map(book => ({
      id: book.id,
      phys: {
        width_mm: book.width ? parseFloat(book.width) : 140,
        height_mm: book.height ? parseFloat(book.height) : 200, 
        spine_mm: book.depth ? parseFloat(book.depth) : 15
      }
    }));
  };

  // Memoized book normalization
  const normalizedDimensions = useMemo(() => {
    const layoutBooks = convertToLayoutBooks(finalBooks);
    return normaliseBooks(layoutBooks, responsiveConfig.BASE_HEIGHT);
  }, [finalBooks, responsiveConfig.BASE_HEIGHT]);

  // Memoized layout calculation using new engine with performance measurement
  const newLayoutItems = useMemo(() => {
    if (finalBooks.length === 0 || containerDimensions.width === 0) return [];
    
    const layoutBooks = convertToLayoutBooks(finalBooks);
    return measureLayout(
      () => calculateLayout(layoutBooks, normalizedDimensions, containerDimensions.width, responsiveConfig),
      finalBooks.length,
      'BookScan Layout Engine'
    );
  }, [finalBooks, normalizedDimensions, containerDimensions.width, responsiveConfig.targetRowHeight, responsiveConfig.gutterX, responsiveConfig.gutterY, responsiveConfig.raggedLastRow, measureLayout]);

  // Legacy dimension calculation (no longer used with new layout engine)
  // Kept for reference but replaced by the headless layout engine

  // Container resize observer with ResizeObserver
  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerDimensions({ 
          width: rect.width || 1200, 
          height: Math.max(rect.height, 600) 
        });
      }
    };

    updateContainerSize();
    
    // Use ResizeObserver for better performance
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerDimensions({ 
          width: width || 1200, 
          height: Math.max(height, 600) 
        });
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Fallback for window resize
    window.addEventListener('resize', updateContainerSize);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateContainerSize);
    };
  }, []);

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
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      toast({
        title: "Success",
        description: data.message || "All books have been refreshed with latest data",
      });
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
          tidyMode={tidyMode}
          onToggleTidyMode={() => setTidyMode(!tidyMode)}
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
        {booksLoading || ((sortBy === 'color-light-to-dark' || sortBy === 'color-dark-to-light') && isColorSorting) ? (
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
              layoutItems={layoutItems}
              books={finalBooks}
              onBookSelect={handleBookSelect}
              onBookUpdate={handleBookUpdate}
              tidyMode={tidyMode}
              chunkSize={200}
              bufferSize={2}
            />
          ) : (
            <div 
              ref={containerRef}
              className="gridContainer relative w-full" 
              style={{ 
                containerType: 'inline-size',
                minHeight: `${Math.max(400, layoutItems.reduce((max, item) => Math.max(max, item.y + item.h + 40), 400))}px`,
                '--rowH': `${responsiveConfig.targetRowHeight}px`,
                '--gutterX': `${responsiveConfig.gutterX}px`,
                '--gutterY': `${responsiveConfig.gutterY}px`
              } as React.CSSProperties}
              data-testid="books-layout"
            >
              {layoutItems.map((item) => {
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
                      transform: `rotateY(${tidyMode ? 0 : item.ry}deg)`,
                      width: `${item.w}px`,
                      height: `${item.h}px`,
                      transition: tidyMode !== undefined ? 'transform 600ms cubic-bezier(.2,.8,.2,1)' : 'transform 220ms cubic-bezier(.2,.8,.2,1)',
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
          className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 bg-coral-red hover:bg-red-600 text-white p-3 sm:p-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 z-50"
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
      
      <BookDetailsModal
        book={selectedBook}
        isOpen={!!selectedBook}
        onClose={() => setSelectedBook(null)}
        onUpdate={handleBookUpdate}
      />
    </div>
  );
}
