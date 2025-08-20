import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Book } from "@shared/schema";
import { MoreVertical } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onUpdate: () => void;
}

const statusConfig = {
  'want-to-read': { label: 'Want to Read', className: 'bg-blue-100 text-blue-800' },
  'reading': { label: 'Reading', className: 'bg-amber-100 text-amber-800' },
  'read': { label: 'Read', className: 'bg-green-100 text-green-800' },
};

export default function BookCard({ book, onSelect, onUpdate }: BookCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { toast } = useToast();

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
    <div 
      className="book-card bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 p-4 border border-gray-200 cursor-pointer"
      onClick={() => onSelect(book)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`card-book-${book.id}`}
    >
      <div className="book-container mb-3">
        <div className="book-3d">
          {book.coverImage ? (
            <img 
              src={book.coverImage} 
              alt={`${book.title} book cover`}
              className="book-cover w-full h-48 object-cover" 
            />
          ) : (
            <div className="book-cover w-full h-48 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-medium">
              <span className="text-sm text-center px-2">No Cover Available</span>
            </div>
          )}
        </div>
      </div>
      
      <h3 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2" data-testid={`text-book-title-${book.id}`}>
        {book.title}
      </h3>
      <p className="text-xs text-gray-600 mb-2" data-testid={`text-book-author-${book.id}`}>
        {book.author}
      </p>
      
      <div className="flex items-center justify-between">
        <button
          onClick={handleStatusClick}
          className={`text-xs px-2 py-1 rounded-full transition-colors ${statusInfo.className} hover:opacity-80`}
          disabled={updateStatusMutation.isPending}
          data-testid={`button-status-${book.id}`}
        >
          {updateStatusMutation.isPending ? 'Updating...' : statusInfo.label}
        </button>
        <button 
          className="text-gray-400 hover:text-primary transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(book);
          }}
          data-testid={`button-more-${book.id}`}
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
