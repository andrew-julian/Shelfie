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
  'want-to-read': { label: 'Want to Read', className: 'bg-gray-100 text-monochrome-black border border-gray-300' },
  'reading': { label: 'Reading', className: 'bg-sky-blue text-white' },
  'read': { label: 'Read', className: 'bg-coral-red text-white' },
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
      className="book-card bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-gray-100 cursor-pointer"
      onClick={() => onSelect(book)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`card-book-${book.id}`}
    >
      <div className="book-container mb-3 h-48 flex items-center justify-center">
        <div className="book">
          {book.coverImage ? (
            <img 
              src={book.coverImage} 
              alt={`${book.title} book cover`}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-medium">
              <span className="text-xs text-center px-1">No Cover Available</span>
            </div>
          )}
        </div>
      </div>
      
      <h3 className="font-bold text-sm text-monochrome-black mb-2 line-clamp-2 leading-tight" data-testid={`text-book-title-${book.id}`}>
        {book.title}
      </h3>
      <p className="text-xs text-gray-600 mb-3 font-medium" data-testid={`text-book-author-${book.id}`}>
        {book.author}
      </p>
      
      <div className="flex items-center justify-between">
        <button
          onClick={handleStatusClick}
          className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${statusInfo.className} hover:scale-105`}
          disabled={updateStatusMutation.isPending}
          data-testid={`button-status-${book.id}`}
        >
          {updateStatusMutation.isPending ? 'Updating...' : statusInfo.label}
        </button>
        <button 
          className="text-gray-400 hover:text-coral-red transition-colors p-1 rounded-lg hover:bg-gray-50"
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
