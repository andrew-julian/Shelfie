import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Book } from "@shared/schema";
import { 
  X, 
  Trash2, 
  Star, 
  Calendar, 
  BookOpen, 
  DollarSign, 
  Package, 
  Globe, 
  Ruler, 
  Weight, 
  Crop,
  Award,
  Tag,
  Heart,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Building,
  Languages,
  Bookmark,
  FileText,
  MessageSquare,
  BarChart3,
  Quote,
  CheckCircle,
  Database,
  Loader2,
  PenTool,
  Save,
  Edit3,
  Sparkles,
  BookmarkPlus
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BeautifulBookDetailsModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

// Enhanced status configuration with more visual appeal
const statusConfig = {
  'want-to-read': { 
    label: 'Want to Read', 
    color: 'from-blue-500 to-indigo-600',
    icon: '📚',
    description: 'Added to your reading wishlist'
  },
  'reading': { 
    label: 'Currently Reading', 
    color: 'from-green-500 to-emerald-600',
    icon: '👀',
    description: 'Currently diving into this book'
  },
  'read': { 
    label: 'Read', 
    color: 'from-gray-500 to-slate-600',
    icon: '✅',
    description: 'Completed and added to your collection'
  },
};

// Mood-based background colors based on genre/category
const getMoodBackground = (book: Book) => {
  const title = book.title?.toLowerCase() || '';
  const categories = book.categories?.join(' ').toLowerCase() || '';
  const combined = `${title} ${categories}`;
  
  if (combined.includes('fiction') || combined.includes('novel') || combined.includes('story')) {
    return 'from-amber-50/80 via-orange-50/60 to-red-50/40'; // Warm tones
  }
  if (combined.includes('science') || combined.includes('technical') || combined.includes('business')) {
    return 'from-blue-50/80 via-indigo-50/60 to-purple-50/40'; // Cool tones
  }
  if (combined.includes('romance') || combined.includes('love')) {
    return 'from-pink-50/80 via-rose-50/60 to-red-50/40'; // Romantic tones
  }
  if (combined.includes('mystery') || combined.includes('thriller') || combined.includes('crime')) {
    return 'from-gray-50/80 via-slate-50/60 to-zinc-50/40'; // Dark/serious tones
  }
  
  // Default warm literary tone
  return 'from-yellow-50/80 via-amber-50/60 to-orange-50/40';
};

// Get extended book data helper
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

export default function BeautifulBookDetailsModal({ book, isOpen, onClose, onUpdate }: BeautifulBookDetailsModalProps) {
  const { toast } = useToast();
  
  // Enhanced state management - ALL HOOKS MUST BE AT THE TOP
  const [currentCoverIndex, setCurrentCoverIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'details' | 'notes'>('overview');
  const [coverHovered, setCoverHovered] = useState(false);
  const [savedToShelf, setSavedToShelf] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('hardcover');
  const [personalNotes, setPersonalNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [animateStars, setAnimateStars] = useState(false);
  const [coverCarouselIndex, setCoverCarouselIndex] = useState(0);
  const [showBookshelfAnimation, setShowBookshelfAnimation] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Load personal notes
  const { data: userNotes } = useQuery({
    queryKey: ['/api/books', book?.id, 'notes'],
    enabled: !!book?.id && isOpen,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutations for various actions
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!book) throw new Error('No book selected');
      const response = await fetch(`/api/books/${book.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) throw new Error('Failed to update book status');
      return response.json();
    },
    onSuccess: (data, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      onUpdate();
      
      // Trigger shelf animation for status changes
      if (newStatus !== 'want-to-read') {
        setShowBookshelfAnimation(true);
        setTimeout(() => setShowBookshelfAnimation(false), 1500);
      }
      
      toast({
        title: "Status Updated",
        description: `Book marked as "${statusConfig[newStatus as keyof typeof statusConfig]?.label}"`,
      });
    }
  });

  const saveNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      if (!book) throw new Error('No book selected');
      const response = await fetch(`/api/books/${book.id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: notes }),
      });
      
      if (!response.ok) throw new Error('Failed to save notes');
      return response.json();
    },
    onSuccess: () => {
      if (book) {
        queryClient.invalidateQueries({ queryKey: ['/api/books', book.id, 'notes'] });
      }
      setEditingNotes(false);
      toast({
        title: "Notes Saved",
        description: "Your personal notes have been saved successfully",
      });
    }
  });

  const deleteBookMutation = useMutation({
    mutationFn: async () => {
      if (!book) throw new Error('No book selected');
      const response = await fetch(`/api/books/${book.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete book');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      onUpdate();
      onClose();
      toast({
        title: "Book Deleted",
        description: "Book has been removed from your library",
      });
    }
  });
  
  // Initialize states when book changes
  useEffect(() => {
    if (book && isOpen) {
      setCurrentCoverIndex(book.selectedCoverIndex || 0);
      setAnimateStars(true);
      setSavedToShelf(book.status !== 'want-to-read');
      
      // Trigger star animation after a brief delay
      const timer = setTimeout(() => setAnimateStars(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [book, isOpen]);

  useEffect(() => {
    if (userNotes && typeof userNotes === 'object' && 'content' in userNotes) {
      setPersonalNotes((userNotes as any).content || '');
    }
  }, [userNotes]);

  // Early return AFTER all hooks
  if (!book) return null;

  const extendedData = getExtendedBookData(book);
  const moodBg = getMoodBackground(book);
  const currentStatus = statusConfig[book.status as keyof typeof statusConfig];

  // Mutations were moved to the top with other hooks

  // Enhanced star rating component with animations
  const renderAnimatedStarRating = (rating: number, size: "sm" | "lg" = "lg") => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const iconSize = size === "sm" ? 16 : 24;
    
    for (let i = 0; i < 5; i++) {
      const delay = animateStars ? i * 100 : 0;
      
      if (i < fullStars) {
        stars.push(
          <Star 
            key={i} 
            size={iconSize} 
            className={`fill-yellow-400 text-yellow-400 transform transition-all duration-500 ${
              animateStars ? 'animate-pulse scale-110' : 'hover:scale-110'
            }`}
            style={{ animationDelay: `${delay}ms` }}
          />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <Star size={iconSize} className="text-gray-200" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star 
                size={iconSize} 
                className={`fill-yellow-400 text-yellow-400 transition-all duration-500 ${
                  animateStars ? 'animate-pulse scale-110' : 'hover:scale-110'
                }`}
                style={{ animationDelay: `${delay}ms` }}
              />
            </div>
          </div>
        );
      } else {
        stars.push(
          <Star 
            key={i} 
            size={iconSize} 
            className="text-gray-200 transition-all duration-300 hover:text-yellow-200" 
          />
        );
      }
    }
    
    return <div className="flex items-center gap-1">{stars}</div>;
  };

  // Handle save to shelf action
  const handleSaveToShelf = () => {
    setSavedToShelf(true);
    updateStatusMutation.mutate('reading');
    
    // Trigger celebration animation
    setShowBookshelfAnimation(true);
    setTimeout(() => setShowBookshelfAnimation(false), 1500);
  };

  // Format picker component
  const FormatPicker = () => {
    const formats = ['Hardcover', 'Paperback', 'Kindle', 'Audiobook'];
    
    return (
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
          <Package className="w-4 h-4" />
          Choose Format
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {formats.map((format) => (
            <button
              key={format}
              onClick={() => setSelectedFormat(format.toLowerCase())}
              className={`p-4 rounded-lg border-2 transition-all duration-300 transform hover:scale-105 ${
                selectedFormat === format.toLowerCase()
                  ? 'border-amber-400 bg-amber-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-amber-200'
              }`}
              data-testid={`format-${format.toLowerCase()}`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">
                  {format === 'Hardcover' && '📘'}
                  {format === 'Paperback' && '📖'}
                  {format === 'Kindle' && '📱'}
                  {format === 'Audiobook' && '🎧'}
                </div>
                <div className="text-sm font-medium">{format}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Collector's card component for metadata
  const CollectorCard = ({ icon: Icon, title, value, ...props }: any) => (
    <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300" {...props}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Icon className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">{title}</div>
          <div className="text-sm font-semibold text-gray-900">{value}</div>
        </div>
      </div>
    </div>
  );

  // Bestseller badge component
  const BestsellerBadge = ({ rank, category, medal = 'gold' }: { rank: string | number; category: string; medal?: 'gold' | 'silver' | 'bronze' }) => {
    const colors: Record<string, string> = {
      gold: 'from-yellow-400 to-amber-500',
      silver: 'from-gray-300 to-gray-400', 
      bronze: 'from-amber-600 to-orange-700'
    };
    
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${colors[medal]} text-white font-semibold text-sm shadow-lg transform hover:scale-105 transition-all duration-300`}>
        <Award className="w-4 h-4" />
        <span>#{rank} in {category}</span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 overflow-hidden border-0 shadow-2xl bg-transparent">
        {/* Glassmorphism Background with Animated Bookshelf */}
        <div className={`absolute inset-0 bg-gradient-to-br ${moodBg} backdrop-blur-3xl`}>
          {/* Animated bookshelf backdrop */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-repeat" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='80' viewBox='0 0 60 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Crect x='0' y='0' width='4' height='80'/%3E%3Crect x='8' y='0' width='4' height='80'/%3E%3Crect x='16' y='0' width='4' height='80'/%3E%3Crect x='24' y='0' width='4' height='80'/%3E%3Crect x='32' y='0' width='4' height='80'/%3E%3Crect x='40' y='0' width='4' height='80'/%3E%3Crect x='48' y='0' width='4' height='80'/%3E%3Crect x='56' y='0' width='4' height='80'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '60px 80px'
            }} />
          </div>
          
          {/* Content Container */}
          <div className="relative w-full h-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl">
            {/* Two-Column Layout */}
            <div className="flex h-full">
              {/* Left Column - Cover Image */}
              <div className="w-2/5 p-8 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50/50 to-gray-100/30">
                {/* Cover Image with Hover Effects */}
                <div 
                  className="relative group cursor-pointer"
                  onMouseEnter={() => setCoverHovered(true)}
                  onMouseLeave={() => setCoverHovered(false)}
                  data-testid="book-cover-large"
                >
                  <div className={`relative transform transition-all duration-500 ${
                    coverHovered ? 'scale-105 rotate-1' : 'scale-100'
                  }`}>
                    <img
                      src={book.coverImage || "/api/placeholder/400/600"}
                      alt={book.title}
                      className={`w-80 h-auto max-h-96 object-cover rounded-lg shadow-2xl transition-all duration-500 ${
                        coverHovered ? 'shadow-3xl' : ''
                      }`}
                      style={{
                        filter: coverHovered ? 'brightness(1.1) contrast(1.05)' : 'brightness(1)',
                        transform: coverHovered ? 'translateZ(20px)' : 'translateZ(0)',
                      }}
                    />
                    
                    {/* Glow effect on hover */}
                    {coverHovered && (
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-tr from-amber-200/20 via-transparent to-amber-100/10 pointer-events-none" />
                    )}
                  </div>
                </div>

                {/* Alternate Cover Carousel */}
                {book.coverImages && Array.isArray(book.coverImages) && book.coverImages.length > 1 && (
                  <div className="mt-6 w-full">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => setCoverCarouselIndex(Math.max(0, coverCarouselIndex - 1))}
                        className="p-2 rounded-full bg-white/80 shadow-lg hover:bg-white transition-all duration-200"
                        disabled={coverCarouselIndex === 0}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      <div className="flex gap-2 overflow-hidden">
                        {(book.coverImages || []).slice(coverCarouselIndex, coverCarouselIndex + 3).map((cover, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentCoverIndex(coverCarouselIndex + index)}
                            className={`relative rounded-lg border-2 transition-all duration-300 transform hover:scale-110 ${
                              coverCarouselIndex + index === currentCoverIndex 
                                ? 'border-amber-400 shadow-lg' 
                                : 'border-gray-200'
                            }`}
                          >
                            <img
                              src={cover}
                              alt={`Cover ${index + 1}`}
                              className="w-12 h-16 object-cover rounded-md"
                            />
                          </button>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => setCoverCarouselIndex(Math.min((book.coverImages || []).length - 3, coverCarouselIndex + 1))}
                        className="p-2 rounded-full bg-white/80 shadow-lg hover:bg-white transition-all duration-200"
                        disabled={coverCarouselIndex >= (book.coverImages || []).length - 3}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Animated Virtual Bookshelf */}
                {showBookshelfAnimation && (
                  <div className="mt-6 flex items-center justify-center">
                    <div className="animate-bounce bg-amber-100 rounded-lg p-3 shadow-lg">
                      <div className="flex items-center gap-2 text-amber-700">
                        <BookmarkPlus className="w-5 h-5" />
                        <span className="text-sm font-medium">Added to shelf!</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Details */}
              <div className="flex-1 flex flex-col">
                {/* Header with Close Button */}
                <div className="relative p-6 pb-0">
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 shadow-lg hover:bg-white transition-all duration-200 hover:scale-110"
                    data-testid="close-modal"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Book Title & Author - Serif Typography */}
                <div className="px-6 pb-6">
                  <h1 className="font-serif text-4xl font-bold text-gray-900 mb-3 leading-tight tracking-wide" style={{ fontFamily: 'Merriweather, serif' }}>
                    {book.title}
                  </h1>
                  <p className="font-serif text-xl text-gray-600 italic mb-4" style={{ fontFamily: 'Merriweather, serif' }}>
                    by {book.author}
                  </p>

                  {/* Animated Rating */}
                  {book.rating && (
                    <div className="flex items-center gap-3 mb-6">
                      {renderAnimatedStarRating(parseFloat(book.rating))}
                      <span className="text-lg text-gray-600 font-medium">
                        ({book.ratingsTotal || 'No reviews'})
                      </span>
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  <div className="flex items-center gap-4 mb-6">
                    {/* Save to Shelf / Wishlist Button */}
                    <button
                      onClick={handleSaveToShelf}
                      className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 ${
                        savedToShelf
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                          : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg hover:shadow-xl'
                      }`}
                      data-testid="save-to-shelf-button"
                    >
                      {savedToShelf ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          In Library
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-5 h-5" />
                          Save to Shelf
                        </>
                      )}
                    </button>

                    {/* Status Selector */}
                    <Select value={book.status} onValueChange={(value) => updateStatusMutation.mutate(value)}>
                      <SelectTrigger className="w-48 h-12 border-2 border-gray-200 rounded-lg font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{currentStatus?.icon}</span>
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <span>{config.icon}</span>
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Price Tag */}
                    {book.price && (
                      <div className="relative">
                        <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded-lg font-bold text-lg shadow-lg transform hover:scale-105 transition-all duration-300">
                          ${book.price}
                          {/* Ribbon corner effect */}
                          <div className="absolute top-0 right-0 w-0 h-0 border-l-8 border-l-transparent border-t-8 border-t-red-700"></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section Divider */}
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent"></div>
                </div>

                {/* Scrollable Content Area */}
                <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
                  <div className="space-y-8 pb-6">
                    {/* Format Picker */}
                    <FormatPicker />

                    {/* Overview Section */}
                    <div className="space-y-6">
                      <h2 className="font-serif text-2xl font-semibold text-gray-900 flex items-center gap-3">
                        <FileText className="w-6 h-6 text-amber-600" />
                        Overview
                      </h2>

                      {/* Description with Literary Styling */}
                      {book.description && (
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
                          <p className="text-gray-700 leading-relaxed text-lg font-serif" style={{ fontFamily: 'Lora, serif' }}>
                            {book.description}
                          </p>
                        </div>
                      )}

                      {/* Editorial Reviews Carousel */}
                      {extendedData.editorial_reviews && Array.isArray(extendedData.editorial_reviews) && extendedData.editorial_reviews.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="font-serif text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <Quote className="w-5 h-5 text-amber-600" />
                            Editorial Reviews
                          </h3>
                          <div className="space-y-4">
                            {(Array.isArray(extendedData.editorial_reviews) ? extendedData.editorial_reviews : []).slice(0, 3).map((review: any, index: number) => (
                              <blockquote 
                                key={index}
                                className={`relative p-6 rounded-xl border-l-4 border-amber-400 transition-all duration-500 transform hover:scale-[1.02] ${
                                  index % 2 === 0 ? 'bg-amber-50' : 'bg-orange-50'
                                }`}
                                style={{ 
                                  animationDelay: `${index * 200}ms`,
                                  animation: 'fadeInUp 0.6s ease-out forwards'
                                }}
                              >
                                <Quote className="absolute top-4 left-4 w-6 h-6 text-amber-400 opacity-50" />
                                <p className="font-serif text-gray-700 italic text-lg leading-relaxed pl-8" style={{ fontFamily: 'Lora, serif' }}>
                                  "{review.body || review.text || review}"
                                </p>
                                {review.source && (
                                  <cite className="block mt-3 text-sm text-gray-600 font-medium not-italic">
                                    — {review.source}
                                  </cite>
                                )}
                              </blockquote>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Premium Details Section - Collector's Card Style */}
                    <div className="space-y-6">
                      <h2 className="font-serif text-2xl font-semibold text-gray-900 flex items-center gap-3">
                        <Database className="w-6 h-6 text-amber-600" />
                        Book Details
                      </h2>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {book.isbn && (
                          <CollectorCard icon={Tag} title="ISBN" value={book.isbn} />
                        )}
                        {book.publishYear && (
                          <CollectorCard icon={Calendar} title="Published" value={book.publishYear} />
                        )}
                        {book.publisher && (
                          <CollectorCard icon={Building} title="Publisher" value={book.publisher} />
                        )}
                        {book.pages && (
                          <CollectorCard icon={FileText} title="Pages" value={book.pages} />
                        )}
                        {book.language && (
                          <CollectorCard icon={Languages} title="Language" value={book.language} />
                        )}
                        {book.dimensions && (
                          <CollectorCard icon={Ruler} title="Dimensions" value={book.dimensions} />
                        )}
                        {book.weight && (
                          <CollectorCard icon={Weight} title="Weight" value={book.weight} />
                        )}
                      </div>

                      {/* Bestseller Rankings with Animated Badges */}
                      {extendedData.bestsellers_rank && Array.isArray(extendedData.bestsellers_rank) && extendedData.bestsellers_rank.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="font-serif text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <Award className="w-5 h-5 text-amber-600" />
                            Bestseller Rankings
                          </h3>
                          <div className="flex flex-wrap gap-3">
                            {(Array.isArray(extendedData.bestsellers_rank) ? extendedData.bestsellers_rank : []).slice(0, 3).map((rankItem: any, index: number) => {
                              const category = rankItem.category || rankItem.name || `Category ${index + 1}`;
                              const rank = rankItem.rank || rankItem.position || 'N/A';
                              const medal = index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze';
                              
                              return (
                                <BestsellerBadge 
                                  key={index}
                                  rank={rank}
                                  category={category}
                                  medal={medal}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Personal Notes Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="font-serif text-2xl font-semibold text-gray-900 flex items-center gap-3">
                          <PenTool className="w-6 h-6 text-amber-600" />
                          Personal Notes
                        </h2>
                        <button
                          onClick={() => setEditingNotes(!editingNotes)}
                          className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-all duration-200"
                          data-testid="edit-notes-button"
                        >
                          <Edit3 className="w-4 h-4" />
                          {editingNotes ? 'Cancel' : 'Edit Notes'}
                        </button>
                      </div>

                      {editingNotes ? (
                        <div className="space-y-3">
                          <Textarea
                            value={personalNotes}
                            onChange={(e) => setPersonalNotes(e.target.value)}
                            placeholder="Add your thoughts, favorite quotes, or memorable moments from this book..."
                            className="min-h-32 resize-none border-2 border-amber-200 focus:border-amber-400 rounded-lg font-serif"
                            style={{ fontFamily: 'Lora, serif' }}
                            data-testid="notes-textarea"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveNotesMutation.mutate(personalNotes)}
                              disabled={saveNotesMutation.isPending}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 disabled:opacity-50"
                              data-testid="save-notes-button"
                            >
                              <Save className="w-4 h-4" />
                              {saveNotesMutation.isPending ? 'Saving...' : 'Save Notes'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200 min-h-32">
                          {personalNotes ? (
                            <p className="text-gray-700 leading-relaxed font-serif whitespace-pre-wrap" style={{ fontFamily: 'Lora, serif' }}>
                              {personalNotes}
                            </p>
                          ) : (
                            <div className="flex items-center justify-center h-20 text-gray-500">
                              <div className="text-center">
                                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No personal notes yet. Click "Edit Notes" to add your thoughts!</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-6 border-t border-gray-200">
                      <button
                        onClick={() => deleteBookMutation.mutate()}
                        disabled={deleteBookMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all duration-200 disabled:opacity-50"
                        data-testid="delete-book-button"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deleteBookMutation.isPending ? 'Deleting...' : 'Delete Book'}
                      </button>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Add custom CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .shadow-3xl {
    box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25), 0 25px 50px -12px rgba(0, 0, 0, 0.15);
  }
`;
document.head.appendChild(style);