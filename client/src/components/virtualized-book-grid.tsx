import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import BookCard from '@/components/book-card';
import { Book } from '@shared/schema';
import { LayoutItem } from '@/layout/ShelfieLayoutEngine';

interface VirtualizedBookGridProps {
  layoutItems: LayoutItem[];
  books: Book[];
  onBookSelect: (book: Book) => void;
  onBookUpdate: () => void;
  onBookPreview?: (book: Book) => void;
  chunkSize?: number;
  bufferSize?: number;
  sortBy?: string;
}

interface ChunkData {
  id: number;
  items: LayoutItem[];
  startY: number;
  endY: number;
  height: number;
}

export default function VirtualizedBookGrid({
  layoutItems,
  books,
  onBookSelect,
  onBookUpdate,
  onBookPreview,
  chunkSize = 200,
  bufferSize = 4,
  sortBy
}: VirtualizedBookGridProps) {
  console.log('🎯 VirtualizedBookGrid render:', { sortBy, propsReceived: Object.keys(arguments[0]) });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportTop, setViewportTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);
  const [visibleChunks, setVisibleChunks] = useState(new Set<number>());
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  // Category grouping logic for when sortBy is 'categories'
  const categoryGroups = useMemo(() => {
    console.log('🏷️ Category grouping check:', { sortBy, booksCount: books.length, layoutItemsCount: layoutItems.length });
    
    if (sortBy !== 'categories') {
      console.log('🏷️ Not sorting by categories, skipping groups');
      return [];
    }
    
    const groups: { category: string; startY: number; books: Book[] }[] = [];
    let currentCategory = '';
    let currentBooks: Book[] = [];
    let startY = 0;

    layoutItems.forEach((item, index) => {
      const book = books.find(b => b.id === item.id);
      if (!book) return;

      // Get meaningful category (skip generic "Books" category)
      let category = 'Uncategorized';
      if (book.categories && book.categories.length > 0) {
        for (const cat of book.categories) {
          if (cat && cat.toLowerCase() !== 'books') {
            category = cat;
            break;
          }
        }
      }

      console.log(`🏷️ Book "${book.title}" -> Category: "${category}"`);

      if (category !== currentCategory) {
        if (currentBooks.length > 0) {
          groups.push({ category: currentCategory, startY, books: currentBooks });
          console.log(`🏷️ Added group: "${currentCategory}" with ${currentBooks.length} books at Y=${startY}`);
        }
        currentCategory = category;
        currentBooks = [book];
        startY = item.y;
      } else {
        currentBooks.push(book);
      }
    });

    if (currentBooks.length > 0) {
      groups.push({ category: currentCategory, startY, books: currentBooks });
      console.log(`🏷️ Added final group: "${currentCategory}" with ${currentBooks.length} books at Y=${startY}`);
    }

    console.log(`🏷️ Final groups:`, groups);
    return groups;
  }, [sortBy, books, layoutItems]);

  // Organize layout items into chunks
  const chunks = useMemo(() => {
    const chunkArray: ChunkData[] = [];
    
    for (let i = 0; i < layoutItems.length; i += chunkSize) {
      const chunkItems = layoutItems.slice(i, i + chunkSize);
      if (chunkItems.length === 0) continue;
      
      const startY = Math.min(...chunkItems.map(item => item.y));
      const endY = Math.max(...chunkItems.map(item => item.y + item.h));
      
      chunkArray.push({
        id: Math.floor(i / chunkSize),
        items: chunkItems,
        startY,
        endY,
        height: endY - startY
      });
    }
    
    return chunkArray;
  }, [layoutItems, chunkSize]);

  // Calculate total content height
  const totalHeight = useMemo(() => {
    if (chunks.length === 0) return 400;
    const lastChunk = chunks[chunks.length - 1];
    return lastChunk.endY + 40; // Add bottom padding
  }, [chunks]);

  // Intersection Observer for viewport tracking
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const updateVisibleChunks = useCallback(() => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const scrollTop = containerRef.current.scrollTop;
    const viewHeight = containerRect.height;
    
    setViewportTop(scrollTop);
    setViewportHeight(viewHeight);

    const newVisibleChunks = new Set<number>();

    chunks.forEach(chunk => {
      const chunkTop = chunk.startY;
      const chunkBottom = chunk.endY;
      
      // Check if chunk is in viewport or buffer zone
      const bufferZone = viewHeight * bufferSize;
      const visibleTop = scrollTop - bufferZone;
      const visibleBottom = scrollTop + viewHeight + bufferZone;
      
      if (chunkBottom >= visibleTop && chunkTop <= visibleBottom) {
        newVisibleChunks.add(chunk.id);
      }
    });

    // Proactive loading: Add next few chunks that are approaching viewport
    const currentBottomVisible = scrollTop + viewHeight;
    const proactiveLoadDistance = viewHeight * 3; // Load chunks 3 viewports ahead for better scroll experience
    
    chunks.forEach(chunk => {
      if (chunk.startY <= currentBottomVisible + proactiveLoadDistance && 
          chunk.startY > currentBottomVisible) {
        newVisibleChunks.add(chunk.id);
      }
    });

    // Initial load optimization: Load several chunks immediately on page load
    if (scrollTop === 0) {
      const initialLoadDistance = viewHeight * 2; // Load 2 viewports worth initially
      chunks.forEach(chunk => {
        if (chunk.startY <= initialLoadDistance) {
          newVisibleChunks.add(chunk.id);
        }
      });
    }

    // Always include chunk with focused item
    if (focusedItemId) {
      const focusedItem = layoutItems.find(item => item.id === focusedItemId);
      if (focusedItem) {
        const focusedChunk = chunks.find(chunk => 
          chunk.items.some(item => item.id === focusedItemId)
        );
        if (focusedChunk) {
          newVisibleChunks.add(focusedChunk.id);
        }
      }
    }

    setVisibleChunks(newVisibleChunks);
  }, [chunks, focusedItemId, layoutItems, bufferSize]);

  // Setup scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      updateVisibleChunks();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    updateVisibleChunks(); // Initial calculation

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [updateVisibleChunks]);

  // Update viewport when layout changes
  useEffect(() => {
    updateVisibleChunks();
  }, [layoutItems, updateVisibleChunks]);

  // Keyboard navigation support
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const currentIndex = layoutItems.findIndex(item => item.id === focusedItemId);
      let nextIndex = currentIndex;
      
      if (event.key === 'ArrowDown' && currentIndex < layoutItems.length - 1) {
        nextIndex = currentIndex + 1;
      } else if (event.key === 'ArrowUp' && currentIndex > 0) {
        nextIndex = currentIndex - 1;
      }
      
      if (nextIndex !== currentIndex) {
        const nextItem = layoutItems[nextIndex];
        setFocusedItemId(nextItem.id);
        
        // Ensure the chunk containing the focused item is visible
        const containingChunk = chunks.find(chunk =>
          chunk.items.some(item => item.id === nextItem.id)
        );
        if (containingChunk) {
          setVisibleChunks(prev => new Set([...Array.from(prev), containingChunk.id]));
        }
        
        // Scroll to item if needed
        if (containerRef.current) {
          const itemTop = nextItem.y;
          const itemBottom = nextItem.y + nextItem.h;
          const scrollTop = containerRef.current.scrollTop;
          const viewHeight = containerRef.current.clientHeight;
          
          if (itemTop < scrollTop) {
            containerRef.current.scrollTop = itemTop - 20;
          } else if (itemBottom > scrollTop + viewHeight) {
            containerRef.current.scrollTop = itemBottom - viewHeight + 20;
          }
        }
      }
    }
  }, [layoutItems, focusedItemId, chunks]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Render visible chunks
  const renderChunks = () => {
    return chunks.map(chunk => {
      const isVisible = visibleChunks.has(chunk.id);
      
      if (!isVisible) {
        // Render empty placeholder to maintain scroll height
        return (
          <div
            key={`placeholder-${chunk.id}`}
            style={{
              position: 'absolute',
              top: chunk.startY,
              height: chunk.height,
              width: '100%',
              pointerEvents: 'none'
            }}
          />
        );
      }

      return (
        <div key={`chunk-${chunk.id}`}>
          {chunk.items.map(item => {
            const book = books.find(b => b.id === item.id);
            if (!book) return null;

            return (
              <div
                key={item.id}
                className="absolute"
                style={{
                  '--x': `${item.x}px`,
                  '--y': `${item.y}px`,
                  '--z': item.z,
                  '--w': `${item.w}px`,
                  '--h': `${item.h}px`,
                  '--d': `${item.d}px`,
                  '--ry': `${item.ry}deg`,
                  left: `var(--x)`,
                  top: `var(--y)`,
                  zIndex: Math.min(Math.round(item.z * 100), 100),
                  transform: `rotateY(${item.ry}deg)`,
                  transition: 'transform 220ms cubic-bezier(.2,.8,.2,1)',
                  width: `var(--w)`,
                  height: `var(--h)`
                } as React.CSSProperties}
                tabIndex={0}
                onFocus={() => setFocusedItemId(item.id)}
              >
                <BookCard
                  book={book}
                  onSelect={onBookSelect}
                  onUpdate={onBookUpdate}
                  onPreview={onBookPreview}
                  customDimensions={{
                    width: item.w,
                    height: item.h,
                    depth: item.d
                  }}
                />
              </div>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div
      ref={containerRef}
      className="gridContainer relative w-full overflow-auto"
      style={{
        containerType: 'inline-size',
        height: '100vh',
        maxHeight: '800px'
      }}
      data-testid="virtualized-books-layout"
    >
      <div
        className="relative"
        style={{
          height: `${totalHeight}px`,
          minHeight: '400px'
        }}
      >
        {renderChunks()}
        {/* Category headers overlay when sorting by categories */}
        {sortBy === 'categories' && categoryGroups.map((group, index) => (
          <div
            key={`category-header-${index}`}
            className="absolute z-50 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 py-2 shadow-sm"
            style={{
              top: Math.max(0, group.startY - 40),
              height: '40px'
            }}
          >
            <div className="flex items-center h-full">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                {group.category}
                <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                  ({group.books.length} book{group.books.length !== 1 ? 's' : ''})
                </span>
              </h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}