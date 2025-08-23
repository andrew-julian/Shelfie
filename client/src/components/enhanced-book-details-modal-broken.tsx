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
import { CoverEditorModal } from "./cover-editor-modal";
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
  const [showCoverEditor, setShowCoverEditor] = useState(false);
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
    onSuccess: (data) => {
      // Update local state immediately with the new cropped image
      if (data?.croppedImageUrl) {
        setCurrentCoverImage(data.croppedImageUrl);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      onUpdate();
      setShowCropper(false);
      setShowCoverEditor(false);
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

  const refreshBookDataMutation = useMutation({
    mutationFn: async () => {
      if (!book) return;
      
      const response = await fetch(`/api/books/${book.id}/refresh`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh book data');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      onUpdate();
      toast({
        title: "Success",
        description: "Book data refreshed successfully from Amazon",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to refresh book data from Amazon",
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
        <DialogContent className="w-full max-w-4xl max-h-[95vh] overflow-hidden p-0 sm:p-6 [&>button]:hidden relative">
          {/* Background Cover Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-5"
            style={{
              backgroundImage: `url(${currentCoverImage || "/api/placeholder/300/400"})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(1px) saturate(1.2)',
            }}
          />
          
          {/* Content Overlay */}
          <div className="relative z-10 flex flex-col h-full max-h-[95vh] bg-white/95 backdrop-blur-sm">
            <DialogHeader className="flex-shrink-0 px-4 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6 border-b relative">
              {/* Extra Large Mobile-Friendly Close Button */}
              <Button
                variant="ghost"
                size="lg"
                onClick={onClose}
                className="absolute top-1 right-1 sm:top-3 sm:right-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 active:bg-gray-200 p-2 h-14 w-14 sm:h-16 sm:w-16 rounded-full z-20 transition-all duration-200 shadow-sm hover:shadow-md"
                data-testid="button-close-modal"
              >
                <X className="w-8 h-8 sm:w-10 sm:h-10 stroke-[2.5]" />
              </Button>

              {/* Book Header Info */}
              <div className="pr-12 sm:pr-16">
                <div className="flex gap-4">
                  {/* Book Cover */}
                  <div className="flex-shrink-0">
                    <div className="relative group">
                      <img
                        src={currentCoverImage || "/api/placeholder/300/400"}
                        alt={book.title}
                        className="w-20 h-28 sm:w-24 sm:h-32 object-cover rounded shadow-md transition-all duration-300 hover:shadow-lg"
                        data-testid="book-cover-main"
                      />
                      {book.coverImages && book.coverImages.length > 1 && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded flex items-center justify-center">
                          <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title and Author - Left Aligned */}
                  <div className="flex-1 min-w-0 text-left">
                    <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900 mb-2 leading-tight line-clamp-2 text-left">{book.title}</DialogTitle>
                    <p className="text-gray-600 mb-3 text-sm sm:text-base line-clamp-1 text-left">{book.author}</p>
                    
                    {/* Star Rating */}
                    {book.rating && (
                      <div className="flex items-center gap-2 mb-3">
                        {renderStarRating(parseFloat(book.rating), "sm")}
                        <span className="text-xs sm:text-sm text-gray-600">
                          ({book.ratingsTotal || 'No reviews'})
                        </span>
                      </div>
                    )}

                    {/* Reading Status */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <Select value={book.status} onValueChange={(value) => updateStatusMutation.mutate(value)}>
                        <SelectTrigger className="w-full sm:w-40 h-8 text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="want-to-read">Want to Read</SelectItem>
                          <SelectItem value="reading">Currently Reading</SelectItem>
                          <SelectItem value="read">Read</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {book.price && (
                        <Badge variant="secondary" className="text-xs sm:text-sm">
                          ${book.price}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6">
              <div className="space-y-4 sm:space-y-6">
                {/* Action Buttons Section */}
                <div className="pt-2 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refreshBookDataMutation.mutate()}
                      disabled={refreshBookDataMutation.isPending}
                      className="text-green-600 hover:text-green-800 hover:bg-green-50 border-green-200 hover:border-green-300 px-3 py-2 h-10 text-sm"
                      data-testid="button-refresh-book"
                    >
                      <CheckCircle className={`w-4 h-4 ${refreshBookDataMutation.isPending ? 'animate-spin' : ''} mr-2`} />
                      <span>Refresh</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCoverEditor(true)}
                      className="text-gray-600 hover:text-coral-red hover:bg-gray-50 border-gray-200 hover:border-coral-red px-3 py-2 h-10 text-sm"
                      data-testid="button-edit-cover"
                    >
                      <Crop className="w-4 h-4 mr-2" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBookMutation.mutate()}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 px-3 py-2 h-10 text-sm"
                      data-testid="button-delete-book"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>

                {/* Cover Options */}
                {book.coverImages && book.coverImages.length > 1 && (
                  <div className="pb-4 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-3">Other Covers</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
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
                            className="w-6 h-8 sm:w-7 sm:h-10 object-cover rounded-sm"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Navigation Tabs */}
                <div className="flex border-b overflow-x-auto">
                  {[
                    { id: 'overview', label: 'Overview', icon: Eye },
                    { id: 'reviews', label: 'Reviews', icon: Star },
                    { id: 'details', label: 'Details', icon: BookOpen }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id as any)}
                      className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base ${
                        activeTab === id
                          ? 'border-coral-red text-coral-red'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="space-y-4 sm:space-y-6 pb-4">
                  {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Description & Overview */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Overview
                    </h3>
                    <div className="space-y-4">
                      {extendedData?.feature_bullets && extendedData.feature_bullets.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Key Features</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {extendedData.feature_bullets.map((bullet: string, index: number) => (
                              <li key={index} className="text-gray-700">{bullet}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {extendedData?.about_this_item && extendedData.about_this_item.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">About This Item</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {extendedData.about_this_item.map((item: string, index: number) => (
                              <li key={index} className="text-gray-700">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {book.description && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                          <p className="text-gray-700 leading-relaxed">
                            {book.description}
                          </p>
                        </div>
                      )}

                      {extendedData?.editorial_reviews && Array.isArray(extendedData.editorial_reviews) && extendedData.editorial_reviews.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Quote className="w-4 h-4" />
                            Editorial Reviews
                          </h4>
                          <div className="space-y-4">
                            {extendedData.editorial_reviews.map((review: any, index: number) => {
                              // Parse and format the review body to extract individual quotes with sources
                              const parseEditorialReview = (text: string) => {
                                // Split on common patterns that indicate new quotes
                                const quoteParts = text.split(/--/);
                                const quotes = [];
                                
                                for (let i = 0; i < quoteParts.length; i++) {
                                  const part = quoteParts[i].trim();
                                  if (part) {
                                    // Check if this looks like a quote (starts with opening quote or contains quoted content)
                                    const hasQuotes = part.includes('"') && part.includes('"');
                                    const startsWithQuote = part.startsWith('"');
                                    
                                    if (hasQuotes || startsWithQuote) {
                                      // Try to extract quote and attribution
                                      const quoteMatch = part.match(/^[""]([^""]+)[""]?(.*)$/);
                                      if (quoteMatch) {
                                        const quoteText = quoteMatch[1];
                                        let attribution = quoteMatch[2] ? quoteMatch[2].trim() : '';
                                        
                                        // Look for attribution in the next part if not found
                                        if (!attribution && i + 1 < quoteParts.length) {
                                          attribution = quoteParts[i + 1].trim();
                                          i++; // Skip the next part since we used it as attribution
                                        }
                                        
                                        // Clean up attribution - remove leading dashes or common prefixes
                                        attribution = attribution.replace(/^-+/, '').trim();
                                        
                                        quotes.push({ text: quoteText, attribution });
                                      } else {
                                        // Fallback: treat as quote without clear structure
                                        quotes.push({ text: part, attribution: '' });
                                      }
                                    } else if (part.length > 20) {
                                      // Long text without quotes - treat as regular text
                                      quotes.push({ text: part, attribution: '' });
                                    }
                                  }
                                }
                                
                                return quotes.length > 0 ? quotes : [{ text: text, attribution: '' }];
                              };
                              
                              const parsedQuotes = parseEditorialReview(review.body || '');
                              
                              return (
                                <div key={index} className="space-y-3">
                                  {parsedQuotes.map((quote: any, qIndex: number) => (
                                    <div 
                                      key={qIndex} 
                                      className="relative p-4 bg-gradient-to-r from-blue-50 to-gray-50 rounded-lg border-l-4 border-blue-400"
                                    >
                                      <Quote className="absolute top-2 left-2 w-4 h-4 text-blue-400 opacity-60" />
                                      <blockquote className="pl-6 text-gray-800 leading-relaxed italic">
                                        "{quote.text.replace(/^[""]|[""]$/g, '')}"
                                      </blockquote>
                                      {quote.attribution && (
                                        <cite className="block mt-2 text-sm font-medium text-gray-600 not-italic pl-6">
                                          — {quote.attribution}
                                        </cite>
                                      )}
                                      {review.source && qIndex === 0 && (
                                        <div className="absolute top-2 right-3 text-xs text-gray-500 bg-white px-2 py-1 rounded">
                                          {review.source}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {extendedData?.book_description && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Product Description</h4>
                          <p className="text-gray-700 leading-relaxed">
                            {extendedData.book_description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Categories */}
                  {book.categories && book.categories.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Tag className="w-5 h-5" />
                        Categories
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {book.categories.map((category: string, index: number) => (
                          <Badge key={index} variant="outline">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Also Bought */}
                  {extendedData?.also_bought && Array.isArray(extendedData.also_bought) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Customers also bought
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {extendedData.also_bought.map((item: any, index: number) => (
                          <div key={index} className="flex gap-3 p-3 border rounded-lg hover:shadow-md transition-shadow">
                            <div className="w-16 h-20 bg-gray-200 rounded flex items-center justify-center">
                              <BookOpen className="w-6 h-6 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
                              <p className="text-xs text-gray-500 mt-1">{item.author}</p>
                              <p className="text-sm font-semibold text-coral-red mt-1">
                                {item.price?.raw || item.price?.value || item.price || "N/A"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  {/* Rating Breakdown */}
                  {extendedData?.rating_breakdown && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Rating Breakdown</h3>
                      <div className="space-y-2">
                        {Object.entries(extendedData.rating_breakdown).reverse().map(([key, value]: [string, any], index: number) => {
                          const starNum = 5 - index;
                          return (
                            <div key={key} className="flex items-center gap-3">
                              <span className="text-sm w-8">{starNum} ★</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-yellow-400 h-2 rounded-full"
                                  style={{ width: `${value.percentage}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-500 w-12">
                                {value.percentage}%
                              </span>
                              <span className="text-sm text-gray-500 w-16">
                                ({value.count.toLocaleString()})
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Top Reviews */}
                  {extendedData?.top_reviews && Array.isArray(extendedData.top_reviews) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Top Reviews</h3>
                      <div className="space-y-4">
                        {extendedData.top_reviews.map((review: any) => (
                          <div key={review.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {renderStarRating(review.rating)}
                                <span className="font-semibold text-sm">{review.title}</span>
                              </div>
                              {review.verified_purchase && (
                                <Badge variant="outline" className="text-xs">
                                  Verified Purchase
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-700 text-sm mb-2 line-clamp-3">{review.body}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>
                                {review.date?.raw || review.date?.utc || review.date || "N/A"}
                              </span>
                              <span>{review.helpful_votes} people found this helpful</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Physical Specifications */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Ruler className="w-5 h-5" />
                      Physical Specifications
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {book.dimensions && (
                        <div className="flex justify-between p-3 bg-gray-50 rounded">
                          <span className="text-gray-600">Dimensions</span>
                          <span className="font-medium">{book.dimensions}</span>
                        </div>
                      )}
                      {book.weight && (
                        <div className="flex justify-between p-3 bg-gray-50 rounded">
                          <span className="text-gray-600">Weight</span>
                          <span className="font-medium">{book.weight}</span>
                        </div>
                      )}
                      {book.pages && (
                        <div className="flex justify-between p-3 bg-gray-50 rounded">
                          <span className="text-gray-600">Pages</span>
                          <span className="font-medium">{book.pages}</span>
                        </div>
                      )}
                      {book.language && (
                        <div className="flex justify-between p-3 bg-gray-50 rounded">
                          <span className="text-gray-600">Language</span>
                          <span className="font-medium">{book.language}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Publication Details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Building className="w-5 h-5" />
                      Publication Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {book.publisher && (
                        <div className="flex justify-between p-3 bg-gray-50 rounded">
                          <span className="text-gray-600">Publisher</span>
                          <span className="font-medium">{book.publisher}</span>
                        </div>
                      )}
                      {book.publishYear && (
                        <div className="flex justify-between p-3 bg-gray-50 rounded">
                          <span className="text-gray-600">Publication Year</span>
                          <span className="font-medium">{book.publishYear}</span>
                        </div>
                      )}
                      {book.isbn && (
                        <div className="flex justify-between p-3 bg-gray-50 rounded">
                          <span className="text-gray-600">ISBN</span>
                          <span className="font-medium">{book.isbn}</span>
                        </div>
                      )}
                      {book.isbn && book.isbn.length > 10 && (
                        <div className="flex justify-between p-3 bg-gray-50 rounded">
                          <span className="text-gray-600">ISBN-13</span>
                          <span className="font-medium">{book.isbn}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Format Variants */}
                  {extendedData?.variants && Array.isArray(extendedData.variants) && extendedData.variants.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Bookmark className="w-5 h-5" />
                        Available Formats
                      </h3>
                      <div className="space-y-0">
                        {extendedData.variants.map((variant: any, index: number) => {
                          // Extract format name from variant data
                          const format = variant.title || variant.format || variant.binding || `Format ${index + 1}`;
                          
                          // Determine if this is the user's copy based on stored format or best guess
                          const normalizedFormat = format.toLowerCase().replace(/[^a-z]/g, '');
                          const userFormat = book.format?.toLowerCase().replace(/[^a-z]/g, '') || 'hardcover';
                          const isUserCopy = normalizedFormat.includes('hardcover') || normalizedFormat.includes('hard');
                          
                          return (
                            <div 
                              key={index} 
                              className={`py-4 px-0 border-b border-gray-200 last:border-b-0 ${
                                isUserCopy 
                                  ? 'bg-coral-red/5 -mx-6 px-6 border-coral-red/20 rounded-lg border-2 my-2' 
                                  : ''
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <span className="font-medium text-gray-900 text-base">
                                    {format}
                                  </span>
                                  {isUserCopy && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-coral-red text-white">
                                      Your Copy
                                    </span>
                                  )}
                                </div>
                                <div className="text-right">
                                  {variant.price && (
                                    <span className="text-coral-red font-semibold text-lg">
                                      {variant.price.raw || variant.price.value || variant.price}
                                    </span>
                                  )}
                                  {!variant.price && variant.available && (
                                    <span className="text-coral-red font-semibold text-lg">
                                      $0.00
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Bestseller Rankings */}
                  {extendedData?.bestsellers_rank && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Bestseller Rankings
                      </h3>
                      <div className="space-y-0">
                        {Array.isArray(extendedData.bestsellers_rank) ? 
                          extendedData.bestsellers_rank.map((rankItem: any, index: number) => {
                            // Extract category and rank from array item
                            const category = rankItem.category || rankItem.name || rankItem.title || `Category ${index + 1}`;
                            const rank = rankItem.rank || rankItem.position || rankItem.number || 'N/A';
                            
                            return (
                              <div key={index} className="flex justify-between py-3 border-b border-gray-200 last:border-b-0">
                                <span className="text-gray-700">{category}</span>
                                <span className="font-medium text-gray-900">#{rank}</span>
                              </div>
                            );
                          }) :
                          Object.entries(extendedData.bestsellers_rank).map(([category, rankData]: [string, any]) => {
                            // Handle object structure (fallback)
                            const rank = typeof rankData === 'object' 
                              ? (rankData?.rank || rankData?.category || JSON.stringify(rankData))
                              : rankData;
                            
                            return (
                              <div key={category} className="flex justify-between py-3 border-b border-gray-200 last:border-b-0">
                                <span className="text-gray-700">{category}</span>
                                <span className="font-medium text-gray-900">#{rank}</span>
                              </div>
                            );
                          })
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cover Editor Modal */}
      <CoverEditorModal
        isOpen={showCoverEditor}
        onClose={() => setShowCoverEditor(false)}
        book={{
          id: book?.id || '',
          title: book?.title || '',
          coverImages: book?.coverImages || []
        }}
        currentCoverIndex={currentCoverIndex}
        onCoverSelect={(index) => {
          updateCoverMutation.mutate(index);
          setShowCoverEditor(false);
        }}
        onCustomCover={(croppedImageData) => {
          uploadCroppedImageMutation.mutate(croppedImageData);
        }}
        isUpdating={updateCoverMutation.isPending || uploadCroppedImageMutation.isPending}
      />

      {/* Legacy Image Cropper Modal */}
      <ImageCropper
        isOpen={showCropper}
        onClose={() => setShowCropper(false)}
        imageUrl={currentCoverImage}
        onCropComplete={handleCroppedImageSave}
      />
    </>
  );
}
