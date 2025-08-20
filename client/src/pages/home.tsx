import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import StatsCards from "@/components/stats-cards";
import BookCard from "@/components/book-card";
import ScannerModal from "@/components/scanner-modal";
import BookDetailsModal from "@/components/book-details-modal";
import { Book } from "@shared/schema";
import { BookOpen, Camera } from "lucide-react";

export default function Home() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const { data: books = [], isLoading, refetch } = useQuery<Book[]>({
    queryKey: ['/api/books'],
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
      <Header booksCount={books.length} />
      
      <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
        {/* Hero Section */}
        <div className="mb-16 text-center">
          <h2 className="text-5xl font-bold text-monochrome-black mb-6 tracking-tight leading-tight">Your Digital Library</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Scan barcodes to instantly add books to your collection. Browse, organize, and discover your reading journey with modern simplicity.
          </p>
        </div>

        <StatsCards books={books} />

        {/* Books Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="w-full h-48 bg-gray-200 rounded mb-3 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded mb-2 animate-pulse" />
                <div className="h-6 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : books.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6" data-testid="books-grid">
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
          <div className="text-center py-16" data-testid="empty-state">
            <div className="mb-8">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No books in your library yet</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Start building your digital library by scanning book barcodes with your camera.
              </p>
            </div>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="primary-button inline-flex items-center text-lg font-semibold"
              data-testid="button-scan-first-book"
            >
              <Camera className="w-5 h-5 mr-3" />
              Scan Your First Book
            </button>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsScannerOpen(true)}
        className="floating-action-button"
        data-testid="button-floating-scan"
      >
        <Camera className="w-6 h-6" />
      </button>

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
