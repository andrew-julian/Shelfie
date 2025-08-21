import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import BookCard from '@/components/book-card';
import { Book } from '@shared/schema';
import { LayoutItem } from '@/layout/BookScanLayoutEngine';

interface VirtualizedBookGridProps {
  layoutItems: LayoutItem[];
  books: Book[];
  onBookSelect: (book: Book) => void;
  onBookUpdate: () => void;
  tidyMode: boolean;
  chunkSize?: number;
  bufferSize?: number;
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
  tidyMode,
  chunkSize = 200,
  bufferSize = 2
}: VirtualizedBookGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportTop, setViewportTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);
  const [visibleChunks, setVisibleChunks] = useState(new Set<number>());
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

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
          setVisibleChunks(prev => new Set([...prev, containingChunk.id]));
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
                className="absolute transition-all duration-700 ease-out"
                style={{
                  '--x': `${item.x}px`,
                  '--y': `${item.y}px`,
                  '--z': item.z,
                  '--w': `${item.w}px`,
                  '--h': `${item.h}px`,
                  '--d': `${item.d}px`,
                  '--ry': `${tidyMode ? 0 : item.ry}deg`,
                  left: `var(--x)`,
                  top: `var(--y)`,
                  zIndex: Math.round(item.z * 100),
                  transform: `rotateY(var(--ry))`,
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
      </div>
    </div>
  );
}