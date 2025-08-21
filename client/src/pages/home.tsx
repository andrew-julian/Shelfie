import { useState, useMemo, useEffect } from "react";
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
import { getCachedDominantColor } from "@/utils/color-extractor";

type SortOption = 'title-asc' | 'title-desc' | 'author-asc' | 'author-desc' | 'status' | 'date-added' | 'color';
type FilterStatus = 'all' | 'want-to-read' | 'reading' | 'read';

// Helper function to convert hex color to HSL for better color sorting
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Function to sort books by color aesthetically
async function sortBooksByColor(books: Book[]): Promise<Book[]> {
  // Get colors for all books
  const booksWithColors = await Promise.all(
    books.map(async (book) => {
      let color = '#2d3748'; // default
      if (book.coverImage) {
        try {
          color = await getCachedDominantColor(book.coverImage);
        } catch (e) {
          // Use default color if extraction fails
        }
      }
      const hsl = hexToHsl(color);
      return { book, color, hsl };
    })
  );

  // Sort by aesthetic appeal: group similar hues, then by saturation and lightness
  return booksWithColors
    .sort((a, b) => {
      // First sort by hue groups (creating color families)
      const hueA = Math.floor(a.hsl.h / 30) * 30; // Group into 30-degree segments
      const hueB = Math.floor(b.hsl.h / 30) * 30;
      
      if (hueA !== hueB) {
        return hueA - hueB;
      }
      
      // Within same hue group, sort by saturation (vivid colors first)
      if (Math.abs(a.hsl.s - b.hsl.s) > 20) {
        return b.hsl.s - a.hsl.s;
      }
      
      // Finally by lightness (lighter to darker)
      return a.hsl.l - b.hsl.l;
    })
    .map(item => item.book);
}

export default function Home() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-added');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showFilters, setShowFilters] = useState(false);

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
    if (sortBy === 'color') {
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

  useEffect(() => {
    if (sortBy === 'color' && books.length > 0) {
      setIsColorSorting(true);
      sortBooksByColor(books).then(sorted => {
        setColorSortedBooks(sorted);
        setIsColorSorting(false);
      });
    }
  }, [sortBy, books]);

  // Use color-sorted books when appropriate
  const finalBooks = sortBy === 'color' ? colorSortedBooks : books;


  
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
    <div className="min-h-screen bg-white w-full overflow-x-hidden">
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

        {/* Books Grid */}
        {booksLoading || (sortBy === 'color' && isColorSorting) ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4 sm:gap-6 md:gap-8 justify-items-center">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="group">
                <div className="relative w-36 h-48 bg-gray-200 rounded-lg mb-2 animate-pulse" />
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-gray-300 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        ) : finalBooks.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4 sm:gap-6 md:gap-8 justify-items-center items-center" data-testid="books-grid">
            {finalBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onSelect={handleBookSelect}
                onUpdate={handleBookUpdate}
              />
            ))}
          </div>
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
