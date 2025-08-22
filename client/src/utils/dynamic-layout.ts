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
 * LEGACY: Dynamic layout algorithm that preserves color order.
 * NOTE: This algorithm is deprecated in favor of the new headless layout engine.
 * Kept for reference but no longer used in the main layout path.
 * The new engine eliminates O(n²) collision detection in favor of gap-aware jitter.
 */
export function calculateDynamicLayout(
  books: Book[], 
  config: LayoutConfig,
  getDimensions: (book: Book) => { width: number; height: number; depth: number }
): BookPosition[] {
  const positions: BookPosition[] = [];
  const rows: Array<{ books: Book[]; totalWidth: number; height: number }> = [];
  
  // Single-pass book sorting (no O(n²) operations)
  const sortedBooks = books;
  
  // First pass: organize books into rows with minimum 2 books per row
  let currentRow: Book[] = [];
  let currentRowWidth = 0;
  let currentRowHeight = 0;
  
  for (const book of sortedBooks) {
    const dimensions = getDimensions(book);
    const bookWidth = dimensions.width;
    const bookHeight = dimensions.height;
    
    // Check if book fits on current row
    const spaceNeeded = currentRowWidth + (currentRow.length > 0 ? config.minSpacing : 0) + bookWidth;
    const availableWidth = config.containerWidth - (config.padding * 2);
    
    // Ensure minimum 2 books per row across all screen sizes
    const shouldBreakRow = spaceNeeded > availableWidth && currentRow.length >= 2; // Always require at least 2 books before breaking
    
    if (shouldBreakRow) {
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

// Removed O(n²) collision detection and transition layout functions
// The new headless layout engine handles positioning with gap-aware jitter clamping
// eliminating the need for pairwise overlap checks