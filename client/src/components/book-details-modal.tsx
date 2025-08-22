import { useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Book } from "@shared/schema";
import { X, Trash2, Star, Calendar, Users, BookOpen, DollarSign, Package, Globe, Ruler, Weight, Crop } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ImageCropper } from "@/components/image-cropper";

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
  
  // Track the current cover state within the modal
  const [currentCoverIndex, setCurrentCoverIndex] = useState(book?.selectedCoverIndex || 0);
  const [currentCoverImage, setCurrentCoverImage] = useState(book?.coverImage || '');
  const [showCropper, setShowCropper] = useState(false);
  
  // Update local state when book prop changes (modal opens with new book)
  useEffect(() => {
    if (book) {
      setCurrentCoverIndex(book.selectedCoverIndex || 0);
      setCurrentCoverImage(book.coverImage || '');
    }
  }, [book]);

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

  const updateCoverMutation = useMutation({
    mutationFn: async (selectedCoverIndex: number) => {
      if (!book) return;
      
      const response = await fetch(`/api/books/${book.id}/cover`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedCoverIndex }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update book cover');
      }
      
      return response.json();
    },
    onSuccess: (data, selectedCoverIndex) => {
      // Update local state immediately for responsive UI
      if (book?.coverImages && book.coverImages[selectedCoverIndex]) {
        setCurrentCoverIndex(selectedCoverIndex);
        setCurrentCoverImage(book.coverImages[selectedCoverIndex]);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      onUpdate();
      toast({
        title: "Success",
        description: "Book cover updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update book cover",
        variant: "destructive",
      });
    },
  });

  const uploadCroppedImageMutation = useMutation({
    mutationFn: async (croppedImageData: string) => {
      if (!book) return;
      
      const response = await fetch(`/api/books/${book.id}/crop-cover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          croppedImageData,
          originalImageUrl: currentCoverImage
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to save cropped image');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentCoverImage(data.croppedImageUrl);
      setShowCropper(false);
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      onUpdate();
      toast({
        title: "Success",
        description: "Cropped cover image saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save cropped image",
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

  // Cover selection component
  const CoverSelector = ({ className = "" }: { className?: string }) => {
    if (!book?.coverImages || book.coverImages.length <= 1) {
      return null;
    }

    const currentIndex = currentCoverIndex;

    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-sky-blue" />
          <span className="text-sm font-semibold text-gray-700">Choose Cover</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {book.coverImages.map((coverUrl, index) => (
            <button
              key={index}
              onClick={() => updateCoverMutation.mutate(index)}
              disabled={updateCoverMutation.isPending}
              className={`
                relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all duration-200
                ${index === currentIndex 
                  ? 'border-sky-blue shadow-lg scale-105' 
                  : 'border-gray-200 hover:border-sky-blue/50 hover:scale-102'
                }
                ${updateCoverMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              data-testid={`button-cover-option-${index}`}
            >
              <img
                src={coverUrl}
                alt={`${book.title} cover option ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {index === currentIndex && (
                <div className="absolute inset-0 bg-sky-blue/20 flex items-center justify-center">
                  <div className="w-6 h-6 bg-sky-blue rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
        {book.coverImages.length > 1 && (
          <p className="text-xs text-gray-500 mt-2">
            {book.coverImages.length} cover options available • Tap to select
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-book-details">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-xl sm:text-2xl font-bold text-monochrome-black">Book Details</span>
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-details">
              <X className="w-5 h-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        {/* Mobile Header Section */}
        <div className="md:hidden mb-6">
          <div className="flex gap-3 sm:gap-4">
            {/* Mobile Book Cover - Smaller */}
            <div className="flex-shrink-0 w-20 sm:w-28">
              <div className="relative">
                {currentCoverImage ? (
                  <img 
                    src={currentCoverImage} 
                    alt={`${book.title} book cover`}
                    className="w-full rounded-lg shadow-lg"
                    data-testid="img-book-cover-mobile"
                  />
                ) : (
                  <div className="w-full aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg shadow-lg flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                
                {/* Mobile Crop Button */}
                {currentCoverImage && (
                  <div className="absolute top-1 right-1">
                    <Button
                      onClick={() => {
                        console.log('Opening crop modal with image:', currentCoverImage);
                        setShowCropper(true);
                      }}
                      size="sm"
                      variant="secondary"
                      className="bg-white/90 hover:bg-white text-gray-700 shadow-md h-5 w-5 p-0"
                      data-testid="button-crop-cover-mobile"
                    >
                      <Crop className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Mobile Title and Author */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-monochrome-black mb-2 leading-tight line-clamp-3" data-testid="text-book-title-mobile">
                {book.title}
              </h1>
              <div className="flex items-center text-sm sm:text-base text-gray-700 mb-2" data-testid="text-book-author-mobile">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-sky-blue flex-shrink-0" />
                <span className="font-semibold truncate">{book.author}</span>
              </div>
              
              {/* Mobile Rating */}
              {book.rating && (
                <div className="flex items-center bg-yellow-50 px-2 py-1 rounded-lg w-fit">
                  <div className="flex text-yellow-400 mr-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-3 h-3 ${i < Math.floor(Number(book.rating) || 0) ? 'fill-current' : ''}`} 
                      />
                    ))}
                  </div>
                  <span className="font-bold text-xs text-gray-800">{book.rating}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Cover Selection - Mobile */}
          <CoverSelector className="md:hidden mt-4" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Cover Image (Desktop Only) */}
          <div className="lg:col-span-1 hidden md:block">
            <div className="sticky top-4">
              <div className="relative">
                {currentCoverImage ? (
                  <img 
                    src={currentCoverImage} 
                    alt={`${book.title} book cover`}
                    className="w-full rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300"
                    data-testid="img-book-cover"
                  />
                ) : (
                  <div className="w-full aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl shadow-lg flex items-center justify-center">
                    <div className="text-center p-6">
                      <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                      <span className="text-gray-500 text-lg font-medium">No Cover Available</span>
                    </div>
                  </div>
                )}
                
                {/* Desktop Crop Button */}
                {currentCoverImage && (
                  <div className="absolute top-3 right-3">
                    <Button
                      onClick={() => {
                        console.log('Opening crop modal with image:', currentCoverImage);
                        setShowCropper(true);
                      }}
                      size="sm"
                      variant="secondary"
                      className="bg-white/90 hover:bg-white text-gray-700 shadow-md"
                      data-testid="button-crop-cover-desktop"
                    >
                      <Crop className="w-4 h-4 mr-1" />
                      Crop
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Cover Selection - Desktop */}
              <CoverSelector className="mt-6" />
              
              {/* Price Section */}
              {(book.price || book.originalPrice) && (
                <div className="mt-6 p-4 bg-gradient-to-r from-sky-blue/10 to-coral-red/10 rounded-xl border border-sky-blue/20">
                  <div className="flex items-center mb-2">
                    <DollarSign className="w-5 h-5 text-sky-blue mr-2" />
                    <span className="text-sm font-semibold text-gray-700">Pricing</span>
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
                    <div className="text-xs text-gray-600 mt-1 font-medium">
                      {book.availability}
                    </div>
                  )}
                </div>
              )}
              
              {/* Scan New Books Tip */}
              {!book.price && !book.publisher && !book.dimensions && (
                <div className="mt-6 p-4 bg-gradient-to-r from-coral-red/10 to-sky-blue/10 rounded-xl border border-coral-red/20">
                  <div className="flex items-center mb-2">
                    <BookOpen className="w-5 h-5 text-coral-red mr-2" />
                    <span className="text-sm font-semibold text-gray-700">Tip</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Scan new books to see rich details like pricing, dimensions, publisher info, and more!
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Right Columns - Book Information */}
          <div className="md:lg:col-span-2 lg:col-span-2 space-y-6 md:space-y-8">
            {/* Title and Author (Desktop Only) */}
            <div className="hidden md:block pb-6 border-b border-gray-200">
              <h1 className="text-4xl font-bold text-monochrome-black mb-4 leading-tight" data-testid="text-book-title">
                {book.title}
              </h1>
              <div className="flex items-center text-xl text-gray-700 mb-6" data-testid="text-book-author">
                <Users className="w-6 h-6 mr-3 text-sky-blue" />
                <span className="font-semibold">{book.author}</span>
              </div>
              
              {/* Rating and Reviews (Desktop) */}
              <div className="flex items-center space-x-6 mb-6">
                {book.rating && (
                  <div className="flex items-center bg-yellow-50 px-4 py-2 rounded-lg">
                    <div className="flex text-yellow-400 mr-3">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-5 h-5 ${i < Math.floor(Number(book.rating) || 0) ? 'fill-current' : ''}`} 
                        />
                      ))}
                    </div>
                    <span className="font-bold text-lg text-gray-800" data-testid="text-book-rating">{book.rating}</span>
                  </div>
                )}
                {book.ratingsTotal && (
                  <span className="text-gray-600 font-medium">({book.ratingsTotal.toLocaleString()} ratings)</span>
                )}
                {book.reviewsTotal && (
                  <span className="text-gray-600 font-medium">{book.reviewsTotal.toLocaleString()} reviews</span>
                )}
              </div>
            </div>
            
            {/* Rating and Reviews for Mobile */}
            <div className="md:hidden mb-6">
              <div className="flex flex-wrap items-center gap-3">
                {book.ratingsTotal && (
                  <span className="text-gray-600 text-sm">({book.ratingsTotal.toLocaleString()} ratings)</span>
                )}
                {book.reviewsTotal && (
                  <span className="text-gray-600 text-sm">{book.reviewsTotal.toLocaleString()} reviews</span>
                )}
              </div>
            </div>
              
              {/* Categories */}
              {book.categories && book.categories.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-6">
                  {book.categories.slice(0, 4).map((category, index) => (
                    <Badge key={index} className="bg-sky-blue hover:bg-sky-blue/80 text-white px-4 py-2 text-sm font-semibold">
                      {category}
                    </Badge>
                  ))}
                  {book.categories.length > 4 && (
                    <Badge variant="outline" className="text-gray-500 border-2 px-4 py-2 text-sm font-semibold">
                      +{book.categories.length - 4} more
                    </Badge>
                  )}
                </div>
              )}
              
              {/* Basic Info Always Shown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <BookOpen className="w-4 h-4 text-gray-600 mr-2" />
                    <span className="text-sm font-semibold text-gray-700">ISBN</span>
                  </div>
                  <span className="font-mono text-xs md:text-sm text-gray-900 break-all" data-testid="text-book-isbn">{book.isbn}</span>
                </div>
                
                {(book.publishYear || book.publishDate) && (
                  <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Calendar className="w-4 h-4 text-gray-600 mr-2" />
                      <span className="text-sm font-semibold text-gray-700">Published</span>
                    </div>
                    <span className="text-xs md:text-sm text-gray-900" data-testid="text-book-year">
                      {book.publishDate ? formatDate(book.publishDate) : book.publishYear}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Description */}
            {book.description && book.description.trim() && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-monochrome-black flex items-center">
                  <div className="w-1 h-6 bg-coral-red rounded-full mr-3"></div>
                  Description
                </h3>
                <div className="bg-gray-50 p-6 rounded-xl">
                  <p className="text-gray-700 leading-relaxed text-lg" data-testid="text-book-description">
                    {book.description}
                  </p>
                </div>
              </div>
            )}
            
            {/* Key Features */}
            {book.featureBullets && book.featureBullets.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-monochrome-black flex items-center">
                  <div className="w-1 h-6 bg-sky-blue rounded-full mr-3"></div>
                  Key Features
                </h3>
                <div className="bg-gradient-to-r from-sky-blue/5 to-coral-red/5 p-6 rounded-xl border border-sky-blue/20">
                  <ul className="space-y-3">
                    {book.featureBullets.map((bullet, index) => (
                      <li key={index} className="flex items-start text-gray-700 text-lg">
                        <div className="w-3 h-3 bg-coral-red rounded-full mt-2 mr-4 flex-shrink-0" />
                        <span className="leading-relaxed">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {/* Enhanced Details Section */}
            {(book.asin || book.publisher || book.language || book.pages || book.dimensions || book.weight) && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Publication Details */}
                  {(book.asin || book.publisher || book.language || book.publishDate) && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-monochrome-black flex items-center">
                        <div className="w-1 h-6 bg-coral-red rounded-full mr-3"></div>
                        <Calendar className="w-6 h-6 mr-2" />
                        Publication Details
                      </h3>
                      
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl space-y-4">
                        {book.asin && (
                          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                            <span className="text-gray-600 font-medium">ASIN:</span>
                            <span className="font-semibold text-gray-900">{book.asin}</span>
                          </div>
                        )}
                        
                        {book.publishDate && (
                          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                            <span className="text-gray-600 font-medium">Published:</span>
                            <span className="font-semibold text-gray-900" data-testid="text-book-date">
                              {formatDate(book.publishDate)}
                            </span>
                          </div>
                        )}
                        
                        {book.publisher && (
                          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                            <span className="text-gray-600 font-medium">Publisher:</span>
                            <span className="font-semibold text-gray-900">{book.publisher}</span>
                          </div>
                        )}
                        
                        {book.language && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Language:</span>
                            <span className="font-semibold text-gray-900 flex items-center">
                              <Globe className="w-4 h-4 mr-2 text-sky-blue" />
                              {book.language}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Physical Details */}
                  {(book.pages || book.dimensions || book.weight) && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-monochrome-black flex items-center">
                        <div className="w-1 h-6 bg-sky-blue rounded-full mr-3"></div>
                        <Package className="w-6 h-6 mr-2" />
                        Physical Details
                      </h3>
                      
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl space-y-4">
                        {book.pages && (
                          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                            <span className="text-gray-600 font-medium">Pages:</span>
                            <span className="font-semibold text-gray-900 flex items-center" data-testid="text-book-pages">
                              <BookOpen className="w-4 h-4 mr-2 text-coral-red" />
                              {book.pages}
                            </span>
                          </div>
                        )}
                        
                        {book.dimensions && (
                          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                            <span className="text-gray-600 font-medium">Dimensions:</span>
                            <span className="font-semibold text-gray-900 flex items-center">
                              <Ruler className="w-4 h-4 mr-2 text-sky-blue" />
                              {book.dimensions}
                            </span>
                          </div>
                        )}
                        
                        {book.weight && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Weight:</span>
                            <span className="font-semibold text-gray-900 flex items-center">
                              <Weight className="w-4 h-4 mr-2 text-coral-red" />
                              {book.weight}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Controls Section */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 md:p-6 rounded-xl border-t border-gray-200 mt-6 md:mt-8">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                  <label htmlFor="status" className="text-sm md:text-base font-bold text-gray-800 flex-shrink-0">
                    Reading Status:
                  </label>
                  <Select 
                    value={book.status} 
                    onValueChange={handleStatusChange}
                    disabled={updateStatusMutation.isPending}
                  >
                    <SelectTrigger className="w-full sm:w-52 h-10 md:h-12 text-sm md:text-lg font-medium" data-testid="select-book-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-sm md:text-lg py-2 md:py-3">
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
                  className="bg-coral-red hover:bg-red-600 h-10 md:h-12 px-4 md:px-6 text-sm md:text-base font-semibold w-full sm:w-auto"
                  data-testid="button-delete-book"
                >
                  <Trash2 className="w-4 md:w-5 h-4 md:h-5 mr-2" />
                  {deleteMutation.isPending ? 'Removing...' : 'Remove from Library'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Image Cropper Modal */}
      <ImageCropper
        isOpen={showCropper}
        onClose={() => setShowCropper(false)}
        imageUrl={currentCoverImage}
        onCropComplete={(croppedImageData) => uploadCroppedImageMutation.mutate(croppedImageData)}
      />
    </>
  );
}
