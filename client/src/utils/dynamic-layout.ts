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
    
    // Check if book fits on current row with shadow spacing
    const shadowBuffer = 25; // Extra buffer for shadows
    if (currentX + bookWidth + config.padding + shadowBuffer > config.containerWidth) {
      // Move to next row with increased vertical spacing
      currentY += currentShelfHeight + config.minSpacing + 15;
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
    
    // Find the best shelf for this book with enhanced shadow spacing
    let bestShelf = shelves.find(shelf => 
      shelf.y >= currentY - config.minSpacing && 
      shelf.availableWidth >= bookWidth + config.minSpacing + 20 // Account for shadows
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
    
    // Calculate position within shelf with enhanced shadow spacing
    const shelfUsedWidth = bestShelf.books.reduce((total, pos) => total + pos.width + config.minSpacing, 0);
    const bookX = config.padding + shelfUsedWidth;
    
    // Add deterministic offset based on book ID for consistent but natural positioning
    const seedOffset = book.id.charCodeAt(0) + book.id.charCodeAt(book.id.length - 1);
    const randomOffsetX = ((seedOffset % 13) - 6) * 2; // ±12px deterministic horizontal variance
    const randomOffsetY = ((seedOffset % 11) - 5) * 1.5; // ±7.5px deterministic vertical variance
    
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
    // Account for shadow area when reducing available width
    const shadowPadding = 20; // Extra space for shadow visual weight
    bestShelf.availableWidth -= bookWidth + config.minSpacing + shadowPadding;
    bestShelf.height = Math.max(bestShelf.height, bookHeight);
    
    // Update current position tracking with shadow considerations
    currentX = bookX + bookWidth + config.minSpacing + 20; // Extra spacing for shadow
    currentShelfHeight = Math.max(currentShelfHeight, bookHeight + 15); // Extra height for shadow
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