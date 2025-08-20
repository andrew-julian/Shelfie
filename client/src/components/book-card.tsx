import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Book } from "@shared/schema";
import { BookOpen } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
        <div className="book">
          <div>
            {book.coverImage ? (
              <img 
                src={book.coverImage} 
                alt={`${book.title} book cover`}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex flex-col items-center justify-center text-white">
                <BookOpen className="w-10 h-10 mb-2" />
                <span className="text-xs font-medium text-center px-2 leading-tight">{book.title}</span>
              </div>
            )}
          </div>
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
