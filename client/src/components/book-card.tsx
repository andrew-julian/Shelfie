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
    <div className="group">
      <div 
        className="relative aspect-[3/4] cursor-pointer transition-all duration-300 transform group-hover:scale-105"
        onClick={() => onSelect(book)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-testid={`card-book-${book.id}`}
      >
        {/* Book Cover */}
        <div className="w-full h-full rounded-xl overflow-hidden shadow-lg group-hover:shadow-2xl transition-all duration-300">
          {book.coverImage ? (
            <img 
              src={book.coverImage} 
              alt={`${book.title} book cover`}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex flex-col items-center justify-center text-gray-500">
              <BookOpen className="w-8 h-8 mb-2" />
              <span className="text-xs font-medium text-center px-2">{book.title}</span>
            </div>
          )}
          
          {/* Overlay on hover */}
          <div className={`absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-xl`} />
        </div>
        
        {/* Status Tag */}
        <button
          onClick={handleStatusClick}
          className={`absolute bottom-2 right-2 w-8 h-8 rounded-full text-white font-bold text-sm ${statusInfo.color} hover:scale-110 transition-all duration-200 shadow-lg flex items-center justify-center`}
          disabled={updateStatusMutation.isPending}
          title={statusInfo.label}
          data-testid={`button-status-${book.id}`}
        >
          {updateStatusMutation.isPending ? '⏳' : statusInfo.icon}
        </button>
        
        {/* Title overlay on hover */}
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 rounded-b-xl transform transition-all duration-300 ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
          <h3 className="font-bold text-white text-sm line-clamp-2 leading-tight mb-1" data-testid={`text-book-title-${book.id}`}>
            {book.title}
          </h3>
          <p className="text-gray-200 text-xs font-medium" data-testid={`text-book-author-${book.id}`}>
            {book.author === 'Unknown Author' ? 'Author unknown' : book.author}
          </p>
        </div>
      </div>
    </div>
  );
}
