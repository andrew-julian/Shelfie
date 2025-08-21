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
  const rows: Array<{ books: Book[]; totalWidth: number; height: number }> = [];
  
  // First pass: organize books into rows with minimum 2 books per row
  let currentRow: Book[] = [];
  let currentRowWidth = 0;
  let currentRowHeight = 0;
  
  for (const book of books) {
    const dimensions = getDimensions(book);
    const bookWidth = dimensions.width;
    const bookHeight = dimensions.height;
    
    // Check if book fits on current row
    const spaceNeeded = currentRowWidth + (currentRow.length > 0 ? config.minSpacing : 0) + bookWidth;
    const availableWidth = config.containerWidth - (config.padding * 2);
    
    // Force new row if we exceed available width OR have more than 2 books already
    if ((spaceNeeded > availableWidth && currentRow.length >= 1) || currentRow.length >= 2) {
      // Save current row and start new one
      if (currentRow.length > 0) {
        rows.push({
          books: [...currentRow],
          totalWidth: currentRowWidth,
          height: currentRowHeight
        });
      }
      
      currentRow = [book];
      currentRowWidth = bookWidth;
      currentRowHeight = bookHeight;
    } else {
      // Add to current row
      if (currentRow.length > 0) {
        currentRowWidth += config.minSpacing;
      }
      currentRow.push(book);
      currentRowWidth += bookWidth;
      currentRowHeight = Math.max(currentRowHeight, bookHeight);
    }
  }
  
  // Add the last row
  if (currentRow.length > 0) {
    rows.push({
      books: [...currentRow],
      totalWidth: currentRowWidth,
      height: currentRowHeight
    });
  }
  
  // Second pass: position books with centered rows
  let currentY = config.padding;
  let zIndex = 1;
  
  for (const row of rows) {
    // Calculate starting X to center this row
    const rowStartX = (config.containerWidth - row.totalWidth) / 2;
    let currentX = rowStartX;
    
    for (const book of row.books) {
      const dimensions = getDimensions(book);
      const bookWidth = dimensions.width;
      const bookHeight = dimensions.height;
      
      // Add deterministic offset based on book ID for consistent but natural positioning
      const seedOffset = book.id.charCodeAt(0) + book.id.charCodeAt(book.id.length - 1);
      const randomOffsetX = ((seedOffset % 13) - 6) * 2; // ±12px deterministic horizontal variance
      const randomOffsetY = ((seedOffset % 11) - 5) * 1.5; // ±7.5px deterministic vertical variance
      
      const position: BookPosition = {
        book,
        x: currentX + randomOffsetX,
        y: currentY + randomOffsetY,
        width: bookWidth,
        height: bookHeight,
        zIndex: zIndex++
      };
      
      positions.push(position);
      
      // Move to next position in row
      currentX += bookWidth + config.minSpacing;
    }
    
    // Move to next row
    currentY += row.height + config.minSpacing;
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