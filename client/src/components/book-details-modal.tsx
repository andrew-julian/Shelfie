import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Book } from "@shared/schema";
import { X, Trash2, Star, Calendar, Users, BookOpen, DollarSign, Package, Globe, Ruler, Weight } from "lucide-react";
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

  const formatPrice = (price: string | null) => {
    if (!price) return null;
    // Handle different price formats
    if (price.startsWith('$')) return price;
    if (!isNaN(Number(price))) return `$${price}`;
    return price;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-screen overflow-y-auto" data-testid="modal-book-details">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-2xl font-bold text-monochrome-black">Book Details</span>
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-details">
              <X className="w-5 h-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Cover Image */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              {book.coverImage ? (
                <img 
                  src={book.coverImage} 
                  alt={`${book.title} book cover`}
                  className="w-full rounded-xl shadow-lg"
                  data-testid="img-book-cover"
                />
              ) : (
                <div className="w-full aspect-[3/4] bg-gray-100 rounded-xl shadow-lg flex items-center justify-center">
                  <div className="text-center p-6">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <span className="text-gray-500">No Cover Available</span>
                  </div>
                </div>
              )}
              
              {/* Price Section */}
              {(book.price || book.originalPrice) && (
                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center mb-2">
                    <DollarSign className="w-4 h-4 text-gray-600 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Pricing</span>
                  </div>
                  {book.price && (
                    <div className="text-2xl font-bold text-monochrome-black">
                      {formatPrice(book.price)}
                    </div>
                  )}
                  {book.originalPrice && book.originalPrice !== book.price && (
                    <div className="text-sm text-gray-500 line-through">
                      {formatPrice(book.originalPrice)}
                    </div>
                  )}
                  {book.availability && (
                    <div className="text-xs text-gray-600 mt-1">
                      {book.availability}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Right Columns - Book Information */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title and Author */}
            <div>
              <h1 className="text-3xl font-bold text-monochrome-black mb-3 leading-tight" data-testid="text-book-title">
                {book.title}
              </h1>
              <div className="flex items-center text-xl text-gray-700 mb-4" data-testid="text-book-author">
                <Users className="w-5 h-5 mr-2" />
                {book.author}
              </div>
              
              {/* Rating and Reviews */}
              {(book.rating || book.ratingsTotal) && (
                <div className="flex items-center space-x-4 mb-4">
                  {book.rating && (
                    <div className="flex items-center">
                      <div className="flex text-yellow-400 mr-2">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-5 h-5 ${i < Math.floor(Number(book.rating) || 0) ? 'fill-current' : ''}`} 
                          />
                        ))}
                      </div>
                      <span className="font-semibold text-lg" data-testid="text-book-rating">{book.rating}</span>
                    </div>
                  )}
                  {book.ratingsTotal && (
                    <span className="text-gray-600">({book.ratingsTotal.toLocaleString()} ratings)</span>
                  )}
                  {book.reviewsTotal && (
                    <span className="text-gray-600">{book.reviewsTotal.toLocaleString()} reviews</span>
                  )}
                </div>
              )}
              
              {/* Categories */}
              {book.categories && book.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {book.categories.slice(0, 4).map((category, index) => (
                    <Badge key={index} variant="secondary" className="bg-sky-blue text-white">
                      {category}
                    </Badge>
                  ))}
                  {book.categories.length > 4 && (
                    <Badge variant="outline" className="text-gray-500">
                      +{book.categories.length - 4} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            {/* Description */}
            {book.description && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-monochrome-black">Description</h3>
                <p className="text-gray-700 leading-relaxed" data-testid="text-book-description">
                  {book.description}
                </p>
              </div>
            )}
            
            {/* Key Features */}
            {book.featureBullets && book.featureBullets.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-monochrome-black">Key Features</h3>
                <ul className="space-y-2">
                  {book.featureBullets.map((bullet, index) => (
                    <li key={index} className="flex items-start text-gray-700">
                      <div className="w-2 h-2 bg-coral-red rounded-full mt-2 mr-3 flex-shrink-0" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Publication Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-monochrome-black flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Publication Details
                </h3>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-sm text-gray-600">ISBN:</span>
                    <span className="col-span-2 font-medium" data-testid="text-book-isbn">{book.isbn}</span>
                  </div>
                  
                  {book.asin && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-sm text-gray-600">ASIN:</span>
                      <span className="col-span-2 font-medium">{book.asin}</span>
                    </div>
                  )}
                  
                  {book.publishDate && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-sm text-gray-600">Published:</span>
                      <span className="col-span-2 font-medium" data-testid="text-book-date">
                        {formatDate(book.publishDate)}
                      </span>
                    </div>
                  )}
                  
                  {book.publisher && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-sm text-gray-600">Publisher:</span>
                      <span className="col-span-2 font-medium">{book.publisher}</span>
                    </div>
                  )}
                  
                  {book.language && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-sm text-gray-600">Language:</span>
                      <span className="col-span-2 font-medium flex items-center">
                        <Globe className="w-4 h-4 mr-1" />
                        {book.language}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-monochrome-black flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Physical Details
                </h3>
                
                <div className="space-y-3">
                  {book.pages && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-sm text-gray-600">Pages:</span>
                      <span className="col-span-2 font-medium flex items-center" data-testid="text-book-pages">
                        <BookOpen className="w-4 h-4 mr-1" />
                        {book.pages}
                      </span>
                    </div>
                  )}
                  
                  {book.dimensions && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-sm text-gray-600">Dimensions:</span>
                      <span className="col-span-2 font-medium flex items-center">
                        <Ruler className="w-4 h-4 mr-1" />
                        {book.dimensions}
                      </span>
                    </div>
                  )}
                  
                  {book.weight && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-sm text-gray-600">Weight:</span>
                      <span className="col-span-2 font-medium flex items-center">
                        <Weight className="w-4 h-4 mr-1" />
                        {book.weight}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Controls Section */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div className="flex items-center space-x-4">
                <label htmlFor="status" className="text-sm font-semibold text-gray-700">
                  Reading Status:
                </label>
                <Select 
                  value={book.status} 
                  onValueChange={handleStatusChange}
                  disabled={updateStatusMutation.isPending}
                >
                  <SelectTrigger className="w-48" data-testid="select-book-status">
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
                className="bg-coral-red hover:bg-red-600"
                data-testid="button-delete-book"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleteMutation.isPending ? 'Removing...' : 'Remove from Library'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
