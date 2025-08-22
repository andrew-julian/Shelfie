import { useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Book } from "@shared/schema";
import { 
  X, 
  Trash2, 
  Star, 
  Calendar, 
  Users, 
  BookOpen, 
  DollarSign, 
  Package, 
  Globe, 
  Ruler, 
  Weight, 
  Crop,
  Clock,
  Award,
  Tag,
  Eye,
  Heart,
  ExternalLink,
  ChevronRight,
  Building,
  Languages,
  Bookmark,
  FileText,
  MessageSquare,
  BarChart3,
  Quote,
  CheckCircle
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ImageCropper } from "@/components/image-cropper";

interface EnhancedBookDetailsModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const statusConfig = {
  'want-to-read': { label: 'Want to Read', color: 'bg-blue-100 text-blue-800' },
  'reading': { label: 'Reading', color: 'bg-green-100 text-green-800' },
  'read': { label: 'Read', color: 'bg-gray-100 text-gray-800' },
};

// Get actual extended book data from database fields
const getExtendedBookData = (book: Book) => {
  return {
    feature_bullets: book.featureBullets || [],
    about_this_item: book.aboutThisItem || [],
    editorial_reviews: book.editorialReviews || [],
    book_description: book.bookDescription || book.description || "",
    variants: book.variants || [],
    rating_breakdown: book.ratingBreakdown || null,
    top_reviews: book.topReviews || [],
    bestsellers_rank: book.bestsellersRank || [],
    also_bought: book.alsoBought || []
  };
};

export default function EnhancedBookDetailsModal({ book, isOpen, onClose, onUpdate }: EnhancedBookDetailsModalProps) {
  const { toast } = useToast();
  
  // Track the current cover state within the modal
  const [currentCoverIndex, setCurrentCoverIndex] = useState(book?.selectedCoverIndex || 0);
  const [currentCoverImage, setCurrentCoverImage] = useState(book?.coverImage || '');
  const [showCropper, setShowCropper] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'details'>('overview');
  
  // Update local state when book prop changes (modal opens with new book)
  useEffect(() => {
    if (book) {
      setCurrentCoverIndex(book.selectedCoverIndex || 0);
      setCurrentCoverImage(book.coverImage || '');
    }
  }, [book]);

  const extendedData = book ? getExtendedBookData(book) : null;

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
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload cropped image');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      onUpdate();
      setShowCropper(false);
      toast({
        title: "Success", 
        description: "Cover image updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update cover image",
        variant: "destructive",
      });
    },
  });

  const deleteBookMutation = useMutation({
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
        description: "Book deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete book",
        variant: "destructive",
      });
    },
  });

  const handleCoverSelect = (index: number) => {
    updateCoverMutation.mutate(index);
  };

  const handleCroppedImageSave = (croppedImageData: string) => {
    uploadCroppedImageMutation.mutate(croppedImageData);
  };

  const renderStarRating = (rating: number, size: "sm" | "lg" = "sm") => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const iconSize = size === "sm" ? 16 : 20;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} size={iconSize} className="fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <Star size={iconSize} className="text-gray-200" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star size={iconSize} className="fill-yellow-400 text-yellow-400" />
            </div>
          </div>
        );
      } else {
        stars.push(<Star key={i} size={iconSize} className="text-gray-200" />);
      }
    }
    return <div className="flex items-center gap-1">{stars}</div>;
  };

  if (!book) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between mb-6">
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-coral-red" />
              Book Details
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCropper(true)}
                className="text-gray-500 hover:text-coral-red"
                data-testid="button-crop-cover"
              >
                <Crop className="w-4 h-4" />
                Edit Cover
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteBookMutation.mutate()}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                data-testid="button-delete-book"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Compact Header */}
            <div className="flex gap-4 pb-4 border-b border-gray-200">
              {/* Small Book Cover */}
              <div className="flex-shrink-0">
                <div className="relative group">
                  <img
                    src={currentCoverImage || "/api/placeholder/300/400"}
                    alt={book.title}
                    className="w-24 h-32 object-cover rounded shadow-md transition-all duration-300 hover:shadow-lg"
                    data-testid="book-cover-main"
                  />
                  {book.coverImages && book.coverImages.length > 1 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded flex items-center justify-center">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Title and Key Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 mb-1 leading-tight">{book.title}</h1>
                <p className="text-gray-600 mb-2">{book.author}</p>
                
                {/* Star Rating */}
                {book.rating && (
                  <div className="flex items-center gap-2 mb-2">
                    {renderStarRating(parseFloat(book.rating), "sm")}
                    <span className="text-sm text-gray-600">
                      ({book.ratingsTotal || 'No reviews'})
                    </span>
                  </div>
                )}

                {/* Reading Status */}
                <div className="flex items-center gap-2">
                  <Select value={book.status} onValueChange={(value) => updateStatusMutation.mutate(value)}>
                    <SelectTrigger className="w-40 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="want-to-read">Want to Read</SelectItem>
                      <SelectItem value="reading">Currently Reading</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {book.price && (
                    <Badge variant="secondary" className="text-sm">
                      ${book.price}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Cover Options - Horizontal Strip */}
              {book.coverImages && book.coverImages.length > 1 && (
                <div className="flex-shrink-0">
                  <p className="text-xs text-gray-500 mb-1">Other Covers</p>
                  <div className="flex gap-1 max-w-32 overflow-x-auto">
                    {book.coverImages.slice(0, 4).map((coverImage, index) => (
                      <button
                        key={index}
                        onClick={() => handleCoverSelect(index)}
                        className={`relative rounded border flex-shrink-0 transition-all ${
                          index === currentCoverIndex 
                            ? 'border-coral-red shadow-sm' 
                            : 'border-gray-200 hover:border-coral-red/50'
                        }`}
                        data-testid={`cover-option-${index}`}
                      >
                        <img
                          src={coverImage}
                          alt={`Cover ${index + 1}`}
                          className="w-7 h-10 object-cover rounded-sm"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-4 mb-6 border-b">
              {[
                { id: 'overview', label: 'Overview', icon: Eye },
                { id: 'reviews', label: 'Reviews', icon: Star },
                { id: 'details', label: 'Details', icon: BookOpen }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                    activeTab === id
                      ? 'border-coral-red text-coral-red'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {extendedData?.book_description && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Description</h3>
                      <p className="text-gray-700 leading-relaxed">{extendedData.book_description}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  <p className="text-gray-500">Reviews tab content...</p>
                </div>
              )}

              {activeTab === 'details' && (
                <div className="space-y-6">
                  <p className="text-gray-500">Details tab content...</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Cropper Modal */}
      <ImageCropper
        isOpen={showCropper}
        onClose={() => setShowCropper(false)}
        imageUrl={currentCoverImage}
        onCropComplete={handleCroppedImageSave}
      />
    </>
  );
}
