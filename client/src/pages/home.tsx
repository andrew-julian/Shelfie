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

type SortOption = 'title-asc' | 'title-desc' | 'author-asc' | 'author-desc' | 'status' | 'date-added';
type FilterStatus = 'all' | 'want-to-read' | 'reading' | 'read';

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

    // Sort books
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
    <div className="min-h-screen bg-white">
      <Header 
        booksCount={allBooks.length}
        filteredCount={books.length}
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
      
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-12 py-6 sm:py-12">
        {/* Hero Section */}
        <div className="mb-8 sm:mb-12 text-center">
          <h2 className="text-2xl sm:text-4xl font-bold text-monochrome-black mb-2 sm:mb-4 tracking-tight leading-tight">Your Digital Library</h2>
          <p className="text-sm sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed mb-4 sm:mb-8 px-2">
            Scan barcodes to instantly add books to your collection. Browse, organize, and discover your reading journey.
          </p>
          
          {/* Horizontal Tracker Bar */}
          {books.length > 0 && (
            <div className="inline-flex items-center gap-4 sm:gap-8 bg-white rounded-full px-4 sm:px-8 py-3 sm:py-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-1 sm:gap-2 text-gray-700">
                <BookIcon className="w-4 h-4 sm:w-5 sm:h-5 text-coral-red" />
                <span className="font-semibold text-base sm:text-lg">{books.length}</span>
                <span className="text-xs sm:text-sm text-gray-500">books</span>
              </div>
              <div className="w-px h-4 sm:h-6 bg-gray-200" />
              <div className="flex items-center gap-1 sm:gap-2 text-gray-700">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                <span className="font-semibold text-base sm:text-lg">{books.filter(b => b.status === 'read').length}</span>
                <span className="text-xs sm:text-sm text-gray-500">read</span>
              </div>
              <div className="w-px h-4 sm:h-6 bg-gray-200" />
              <div className="flex items-center gap-1 sm:gap-2 text-gray-700">
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-sky-blue" />
                <span className="font-semibold text-base sm:text-lg">{books.filter(b => b.status === 'reading').length}</span>
                <span className="text-xs sm:text-sm text-gray-500">reading</span>
              </div>
            </div>
          )}
        </div>

        {/* Books Grid */}
        {booksLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3 sm:gap-6 md:gap-8 justify-items-center">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="group">
                <div className="relative w-36 h-48 bg-gray-200 rounded-lg mb-2 animate-pulse" />
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-gray-300 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        ) : books.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3 sm:gap-6 md:gap-8 justify-items-center" data-testid="books-grid">
            {books.map((book) => (
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
      {books.length > 0 && (
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
