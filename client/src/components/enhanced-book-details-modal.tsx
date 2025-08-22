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
  Bookmark
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

// Mock data for demonstration - in real implementation this would come from API
const getExtendedBookData = (book: Book) => {
  return {
    variants: [
      { title: "Hardcover", price: "$24.99", asin: "1234567890", is_current_product: book.isbn === "1234567890" },
      { title: "Paperback", price: "$16.99", asin: "1234567891", is_current_product: book.isbn === "1234567891" },
      { title: "Kindle", price: "$12.99", asin: "1234567892", is_current_product: false },
      { title: "Audiobook", price: "$19.95", asin: "1234567893", is_current_product: false }
    ],
    rating_breakdown: {
      five_star: { percentage: 65, count: 3420 },
      four_star: { percentage: 22, count: 1156 },
      three_star: { percentage: 8, count: 420 },
      two_star: { percentage: 3, count: 158 },
      one_star: { percentage: 2, count: 105 }
    },
    top_reviews: [
      {
        id: "1",
        title: "Exceptional insight into modern challenges",
        body: "This book provides remarkable clarity on complex issues affecting our daily lives. The research is thorough and the writing engaging...",
        rating: 5,
        verified_purchase: true,
        date: "2024-01-15",
        helpful_votes: 42
      },
      {
        id: "2", 
        title: "Well-researched but lengthy",
        body: "While the content is valuable, I found some sections repetitive. However, the core insights are genuinely helpful...",
        rating: 4,
        verified_purchase: true,
        date: "2024-01-10",
        helpful_votes: 28
      }
    ],
    bestsellers_rank: [
      { rank: 15, category: "Psychology & Mental Health" },
      { rank: 3, category: "Personal Development" },
      { rank: 127, category: "All Books" }
    ],
    also_bought: [
      { title: "Deep Work", author: "Cal Newport", price: "$15.99", image: "/api/placeholder/80/120" },
      { title: "Atomic Habits", author: "James Clear", price: "$18.99", image: "/api/placeholder/80/120" },
      { title: "The Power of Now", author: "Eckhart Tolle", price: "$16.99", image: "/api/placeholder/80/120" }
    ]
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
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
                data-testid="button-close-modal"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Book Cover and Variants */}
                  <div className="space-y-4">
                    <div className="relative group">
                      <img
                        src={currentCoverImage || "/api/placeholder/300/400"}
                        alt={book.title}
                        className="w-full max-w-xs mx-auto rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl"
                        data-testid="book-cover-main"
                      />
                      {book.coverImages && book.coverImages.length > 1 && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                          <span className="text-white text-sm font-medium">Click to change cover</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Cover Options */}
                    {book.coverImages && book.coverImages.length > 1 && (
                      <div className="grid grid-cols-3 gap-2">
                        {book.coverImages.slice(0, 6).map((coverImage, index) => (
                          <button
                            key={index}
                            onClick={() => handleCoverSelect(index)}
                            className={`relative rounded-md overflow-hidden border-2 transition-all ${
                              index === currentCoverIndex 
                                ? 'border-coral-red shadow-md' 
                                : 'border-gray-200 hover:border-coral-red/50'
                            }`}
                            data-testid={`cover-option-${index}`}
                          >
                            <img
                              src={coverImage}
                              alt={`Cover option ${index + 1}`}
                              className="w-full h-16 object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Format Variants */}
                    {extendedData?.variants && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Available Formats
                        </h4>
                        <div className="space-y-2">
                          {extendedData.variants.map((variant, index) => (
                            <div
                              key={index}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                variant.is_current_product
                                  ? 'border-coral-red bg-coral-red/5 shadow-sm'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{variant.title}</span>
                                {variant.is_current_product && (
                                  <Badge variant="default" className="bg-coral-red text-white text-xs">
                                    Your Copy
                                  </Badge>
                                )}
                              </div>
                              <span className="font-semibold text-sm text-coral-red">{variant.price}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Book Information */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Title and Author */}
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">{book.title}</h1>
                      <p className="text-xl text-gray-600 mb-4">by {book.author}</p>
                      
                      {/* Rating and Reviews */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          {renderStarRating(parseFloat(book.rating || "0"), "lg")}
                          <span className="text-lg font-semibold text-gray-900">
                            {book.rating || "0"}
                          </span>
                        </div>
                        <span className="text-gray-500">
                          ({book.ratingsTotal?.toLocaleString() || 0} ratings)
                        </span>
                      </div>

                      {/* Personal Status */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Bookmark className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-500">Status:</span>
                        </div>
                        <Select 
                          value={book.status} 
                          onValueChange={(value) => updateStatusMutation.mutate(value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${config.color.split(' ')[0]}`} />
                                  {config.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Quick Info Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {book.publishYear && (
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Published</p>
                            <p className="font-semibold text-sm">{book.publishYear}</p>
                          </div>
                        </div>
                      )}
                      
                      {book.pages && (
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                          <BookOpen className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Pages</p>
                            <p className="font-semibold text-sm">{book.pages}</p>
                          </div>
                        </div>
                      )}
                      
                      {book.language && (
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                          <Languages className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Language</p>
                            <p className="font-semibold text-sm">{book.language}</p>
                          </div>
                        </div>
                      )}
                      
                      {book.publisher && (
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                          <Building className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Publisher</p>
                            <p className="font-semibold text-sm">{book.publisher}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bestseller Ranks */}
                    {extendedData?.bestsellers_rank && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                          <Award className="w-4 h-4" />
                          Bestseller Ranks
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {extendedData.bestsellers_rank.map((rank, index) => (
                            <Badge key={index} variant="secondary" className="bg-yellow-100 text-yellow-800">
                              #{rank.rank} in {rank.category}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
            </div>

            <Separator className="my-8" />

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
                    <>
                      {/* Description */}
                      {book.description && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Description</h3>
                          <p className="text-gray-700 leading-relaxed">{book.description}</p>
                        </div>
                      )}

                      {/* Categories */}
                      {book.categories && book.categories.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <Tag className="w-5 h-5" />
                            Categories
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {book.categories.map((category, index) => (
                              <Badge key={index} variant="outline">
                                {category}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Also Bought */}
                      {extendedData?.also_bought && (
                        <div>
                          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Customers also bought
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {extendedData.also_bought.map((item, index) => (
                              <div key={index} className="flex gap-3 p-3 border rounded-lg hover:shadow-md transition-shadow">
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  className="w-16 h-20 object-cover rounded"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
                                  <p className="text-xs text-gray-500 mt-1">{item.author}</p>
                                  <p className="text-sm font-semibold text-coral-red mt-1">{item.price}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === 'reviews' && (
                    <>
                      {/* Rating Breakdown */}
                      {extendedData?.rating_breakdown && (
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Rating Breakdown</h3>
                          <div className="space-y-2">
                            {Object.entries(extendedData.rating_breakdown).reverse().map(([key, value], index) => {
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
                      {extendedData?.top_reviews && (
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Top Reviews</h3>
                          <div className="space-y-4">
                            {extendedData.top_reviews.map((review) => (
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
                                  <span>{review.date}</span>
                                  <span>{review.helpful_votes} people found this helpful</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === 'details' && (
                    <>
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
                          {book.width && (
                            <div className="flex justify-between p-3 bg-gray-50 rounded">
                              <span className="text-gray-600">Width</span>
                              <span className="font-medium">{book.width}"</span>
                            </div>
                          )}
                          {book.height && (
                            <div className="flex justify-between p-3 bg-gray-50 rounded">
                              <span className="text-gray-600">Height</span>
                              <span className="font-medium">{book.height}"</span>
                            </div>
                          )}
                          {book.depth && (
                            <div className="flex justify-between p-3 bg-gray-50 rounded">
                              <span className="text-gray-600">Depth</span>
                              <span className="font-medium">{book.depth}"</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Publishing Information */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Building className="w-5 h-5" />
                          Publishing Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {book.isbn && (
                            <div className="flex justify-between p-3 bg-gray-50 rounded">
                              <span className="text-gray-600">ISBN</span>
                              <span className="font-medium font-mono">{book.isbn}</span>
                            </div>
                          )}
                          {book.asin && (
                            <div className="flex justify-between p-3 bg-gray-50 rounded">
                              <span className="text-gray-600">ASIN</span>
                              <span className="font-medium font-mono">{book.asin}</span>
                            </div>
                          )}
                          {book.publishDate && (
                            <div className="flex justify-between p-3 bg-gray-50 rounded">
                              <span className="text-gray-600">Publication Date</span>
                              <span className="font-medium">{book.publishDate}</span>
                            </div>
                          )}
                          {book.amazonDomain && (
                            <div className="flex justify-between p-3 bg-gray-50 rounded">
                              <span className="text-gray-600">Amazon Region</span>
                              <span className="font-medium">{book.amazonDomain}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Personal Library Info */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Bookmark className="w-5 h-5" />
                          Library Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex justify-between p-3 bg-gray-50 rounded">
                            <span className="text-gray-600">Added to Library</span>
                            <span className="font-medium">
                              {new Date(book.addedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between p-3 bg-gray-50 rounded">
                            <span className="text-gray-600">Reading Status</span>
                            <Badge className={statusConfig[book.status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-800'}>
                              {statusConfig[book.status as keyof typeof statusConfig]?.label || book.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </>
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
        onSave={handleCroppedImageSave}
        isLoading={uploadCroppedImageMutation.isPending}
      />
    </>
  );
}