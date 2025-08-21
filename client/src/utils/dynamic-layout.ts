import { Book } from '@shared/schema';

export interface BookPosition {
  book: Book;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface LayoutConfig {
  containerWidth: number;
  containerHeight: number;
  padding: number;
  minSpacing: number;
}

/**
 * Dynamic layout algorithm that preserves color order while preventing overlaps.
 * Uses a bin-packing inspired approach with shelving for optimal space utilization.
 */
export function calculateDynamicLayout(
  books: Book[], 
  config: LayoutConfig,
  getDimensions: (book: Book) => { width: number; height: number; depth: number }
): BookPosition[] {
  const positions: BookPosition[] = [];
  const shelves: Array<{ y: number; height: number; availableWidth: number; books: BookPosition[] }> = [];
  
  let currentX = config.padding;
  let currentY = config.padding;
  let currentShelfHeight = 0;
  let zIndex = 1;

  for (const book of books) {
    const dimensions = getDimensions(book);
    const bookWidth = dimensions.width;
    const bookHeight = dimensions.height;
    
    // Check if book fits on current row
    if (currentX + bookWidth + config.padding > config.containerWidth) {
      // Move to next row
      currentY += currentShelfHeight + config.minSpacing;
      currentX = config.padding;
      currentShelfHeight = 0;
      
      // Create new shelf
      shelves.push({
        y: currentY,
        height: bookHeight,
        availableWidth: config.containerWidth - config.padding * 2,
        books: []
      });
    }
    
    // Find the best shelf for this book (lowest available position)
    let bestShelf = shelves.find(shelf => 
      shelf.y >= currentY - config.minSpacing && 
      shelf.availableWidth >= bookWidth + config.minSpacing
    );
    
    if (!bestShelf) {
      // Create new shelf
      bestShelf = {
        y: currentY,
        height: bookHeight,
        availableWidth: config.containerWidth - config.padding * 2,
        books: []
      };
      shelves.push(bestShelf);
    }
    
    // Calculate position within shelf
    const shelfUsedWidth = bestShelf.books.reduce((total, pos) => total + pos.width + config.minSpacing, 0);
    const bookX = config.padding + shelfUsedWidth;
    
    // Add subtle random offset for natural, non-grid appearance
    const randomOffsetX = (Math.random() - 0.5) * 8; // ±4px horizontal variance
    const randomOffsetY = (Math.random() - 0.5) * 6; // ±3px vertical variance
    
    const position: BookPosition = {
      book,
      x: bookX + randomOffsetX,
      y: bestShelf.y + randomOffsetY,
      width: bookWidth,
      height: bookHeight,
      zIndex: zIndex++
    };
    
    positions.push(position);
    bestShelf.books.push(position);
    bestShelf.availableWidth -= bookWidth + config.minSpacing;
    bestShelf.height = Math.max(bestShelf.height, bookHeight);
    
    // Update current position tracking
    currentX = bookX + bookWidth + config.minSpacing;
    currentShelfHeight = Math.max(currentShelfHeight, bookHeight);
  }
  
  return positions;
}

/**
 * Animated transition layout that smoothly moves books from their current positions
 * to new calculated positions over time.
 */
export function calculateTransitionLayout(
  currentPositions: BookPosition[],
  targetPositions: BookPosition[],
  progress: number // 0-1
): BookPosition[] {
  return currentPositions.map(current => {
    const target = targetPositions.find(t => t.book.id === current.book.id);
    if (!target) return current;
    
    // Eased transition using cubic-bezier for natural movement
    const easeProgress = progress < 0.5 
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    return {
      ...current,
      x: current.x + (target.x - current.x) * easeProgress,
      y: current.y + (target.y - current.y) * easeProgress,
      zIndex: target.zIndex
    };
  });
}

/**
 * Collision detection for manual book dragging/positioning
 */
export function detectCollision(
  position: BookPosition, 
  otherPositions: BookPosition[],
  tolerance: number = 5
): boolean {
  return otherPositions.some(other => {
    if (other.book.id === position.book.id) return false;
    
    return !(
      position.x + position.width + tolerance < other.x ||
      other.x + other.width + tolerance < position.x ||
      position.y + position.height + tolerance < other.y ||
      other.y + other.height + tolerance < position.y
    );
  });
}