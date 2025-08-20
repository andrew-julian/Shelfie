import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Book } from "@shared/schema";
import { X, Trash2, Star } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BookDetailsModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const statusConfig = {
  'want-to-read': 'Want to Read',
  'reading': 'Reading',
  'read': 'Read',
};

export default function BookDetailsModal({ book, isOpen, onClose, onUpdate }: BookDetailsModalProps) {
  const { toast } = useToast();

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!book) return;
      
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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!book) return;
      
      const response = await fetch(`/api/books/${book.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete book');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      onUpdate();
      onClose();
      toast({
        title: "Success",
        description: "Book removed from your library",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove book",
        variant: "destructive",
      });
    },
  });

  if (!book) return null;

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate(newStatus);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to remove this book from your library?")) {
      deleteMutation.mutate();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto" data-testid="modal-book-details">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Book Details</span>
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-details">
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-1/3">
            {book.coverImage ? (
              <img 
                src={book.coverImage} 
                alt={`${book.title} book cover`}
                className="w-full rounded-lg shadow-md"
                data-testid="img-book-cover"
              />
            ) : (
              <div className="w-full aspect-[3/4] bg-gray-200 rounded-lg shadow-md flex items-center justify-center">
                <span className="text-gray-400 text-center px-4">No Cover Available</span>
              </div>
            )}
          </div>
          
          <div className="md:w-2/3 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2" data-testid="text-book-title">
                {book.title}
              </h2>
              <p className="text-lg text-gray-600 mb-4" data-testid="text-book-author">
                {book.author}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">ISBN</p>
                <p className="font-medium" data-testid="text-book-isbn">{book.isbn}</p>
              </div>
              {book.publishYear && (
                <div>
                  <p className="text-sm text-gray-600">Published</p>
                  <p className="font-medium" data-testid="text-book-year">{book.publishYear}</p>
                </div>
              )}
              {book.pages && (
                <div>
                  <p className="text-sm text-gray-600">Pages</p>
                  <p className="font-medium" data-testid="text-book-pages">{book.pages}</p>
                </div>
              )}
              {book.rating && (
                <div>
                  <p className="text-sm text-gray-600">Rating</p>
                  <div className="flex items-center">
                    <div className="flex text-yellow-400 mr-2">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${i < Math.floor(Number(book.rating) || 0) ? 'fill-current' : ''}`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600" data-testid="text-book-rating">{book.rating}</span>
                  </div>
                </div>
              )}
            </div>
            
            {book.description && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Description</p>
                <p className="text-gray-800 leading-relaxed" data-testid="text-book-description">
                  {book.description}
                </p>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center space-x-4">
                <label htmlFor="status" className="text-sm font-medium text-gray-700">
                  Status:
                </label>
                <Select 
                  value={book.status} 
                  onValueChange={handleStatusChange}
                  disabled={updateStatusMutation.isPending}
                >
                  <SelectTrigger className="w-40" data-testid="select-book-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                data-testid="button-delete-book"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleteMutation.isPending ? 'Removing...' : 'Remove'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
