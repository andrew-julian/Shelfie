export type Book = { 
  id: string; 
  phys: { width_mm: number; height_mm: number; spine_mm: number } 
}

export type LayoutItem = { 
  id: string; 
  x: number; 
  y: number; 
  z: number; 
  w: number; 
  h: number; 
  d: number; 
  ry: number 
}

export type LayoutConfig = { 
  BASE_HEIGHT: number; 
  targetRowHeight: number; 
  gutterX: number; 
  gutterY: number; 
  jitterX: number; 
  maxTiltY: number; 
  maxDepth: number; 
  raggedLastRow: boolean 
}

export const DEFAULT_CFG: LayoutConfig = {
  BASE_HEIGHT: 200, 
  targetRowHeight: 200,
  gutterX: 12, 
  gutterY: 14,
  jitterX: 6, 
  maxTiltY: 10, 
  maxDepth: 14,
  raggedLastRow: true
}

/**
 * Fast 32-bit hash function for deterministic randomness
 */
function hash32(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Radical inverse function for Halton sequence generation
 */
function radicalInverse(i: number, base: number): number {
  let result = 0;
  let f = 1 / base;
  while (i > 0) {
    result += f * (i % base);
    i = Math.floor(i / base);
    f /= base;
  }
  return result;
}

/**
 * Halton sequence generator for deterministic quasi-random numbers
 */
function halton(seed: number, base: number): number {
  return radicalInverse(seed, base);
}

/**
 * Normalizes book dimensions to a standard base height
 */
export function normaliseBooks(books: Book[], BASE_HEIGHT: number): Map<string, { w_norm: number; d_norm: number }> {
  const dims = new Map<string, { w_norm: number; d_norm: number }>();
  
  for (const book of books) {
    const scale = BASE_HEIGHT / book.phys.height_mm;
    const w_norm = book.phys.width_mm * scale;
    const d_norm = book.phys.spine_mm * scale;
    dims.set(book.id, { w_norm, d_norm });
  }
  
  return dims;
}

/**
 * Main layout calculation function with O(n) complexity and justified rows
 */
export function calculateLayout(
  books: Book[], 
  dims: Map<string, { w_norm: number; d_norm: number }>, 
  containerWidth: number, 
  cfg: LayoutConfig
): LayoutItem[] {
  if (books.length === 0) return [];
  
  const layoutItems: LayoutItem[] = [];
  let yCursor = 0;
  let rowIndex = 0;
  
  // Single pass row-builder
  let currentRow: Book[] = [];
  let currentRowNaturalWidth = 0;
  
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const bookDims = dims.get(book.id);
    if (!bookDims) continue;
    
    // Calculate natural width at target row height
    const naturalWidth = (bookDims.w_norm * cfg.targetRowHeight) / cfg.BASE_HEIGHT;
    
    // Check if adding this book would exceed container width
    const guttersNeeded = currentRow.length; // Number of gutters if we add this book
    const totalWidthWithBook = currentRowNaturalWidth + naturalWidth + (guttersNeeded * cfg.gutterX);
    
    const shouldStartNewRow = totalWidthWithBook > containerWidth && currentRow.length > 0;
    
    if (shouldStartNewRow) {
      // Process current row
      processRow(currentRow, dims, containerWidth, cfg, yCursor, rowIndex, layoutItems);
      
      // Start new row using actual tallest book height in the row
      const actualRowHeight = Math.max(...currentRow.map(book => book.phys.height_mm * 0.6));
      yCursor += actualRowHeight + cfg.gutterY;
      rowIndex++;
      currentRow = [book];
      currentRowNaturalWidth = naturalWidth;
    } else {
      // Add to current row
      currentRow.push(book);
      currentRowNaturalWidth += naturalWidth;
    }
  }
  
  // Process final row
  if (currentRow.length > 0) {
    processRow(currentRow, dims, containerWidth, cfg, yCursor, rowIndex, layoutItems, true);
  }
  
  return layoutItems;
}

/**
 * Processes a single row with justification and organic positioning
 */
function processRow(
  rowBooks: Book[],
  dims: Map<string, { w_norm: number; d_norm: number }>,
  containerWidth: number,
  cfg: LayoutConfig,
  yCursor: number,
  rowIndex: number,
  layoutItems: LayoutItem[],
  isLastRow: boolean = false
): void {
  if (rowBooks.length === 0) return;
  
  // Calculate natural dimensions preserving true physical proportions
  // Use a scale factor instead of forcing uniform height
  const basePixelScale = 0.6; // Convert mm to pixels with realistic scaling
  let wsum = 0;
  const physicalDimensions = rowBooks.map(book => {
    // Preserve true proportions by scaling mm directly to pixels
    const Wi = book.phys.width_mm * basePixelScale;
    const Hi = book.phys.height_mm * basePixelScale;
    const Di = book.phys.spine_mm * basePixelScale;
    wsum += Wi;
    return { Wi, Hi, Di };
  });
  
  // Calculate scale factor for justification
  const totalGutterWidth = Math.max(0, rowBooks.length - 1) * cfg.gutterX;
  const usable = containerWidth - totalGutterWidth;
  let scale = usable / wsum;
  
  // Preserve natural proportions for all rows, not just the last one
  // Limit scaling to prevent excessive stretching that destroys proportions
  const maxStretch = 1.3; // Allow some stretching but preserve dramatic size differences
  scale = Math.min(scale, maxStretch);
  
  // Row waviness
  const jy = Math.sin(rowIndex * 1.3) * 4;
  
  // Position books in row
  let currentX = 0;
  
  // Create nominal positions first (no jitter)
  const nominalItems: Array<{id: string, w: number, h: number, d: number, x: number}> = [];
  let x = 0;
  
  for (let i = 0; i < rowBooks.length; i++) {
    const book = rowBooks[i];
    const { Wi, Hi, Di } = physicalDimensions[i];
    
    // Apply justification scale but preserve individual heights
    const w = Wi * scale;
    const h = Hi; // Keep natural height - no uniform scaling!
    const d = Math.max(2, Di);
    
    nominalItems.push({ id: book.id, w, h, d, x });
    x += w + cfg.gutterX;
  }
  
  // Calculate row centering offset
  const totalRowWidth = x - cfg.gutterX; // Remove last gutter
  const centerOffset = (containerWidth - totalRowWidth) / 2;
  
  // Apply safe jitter that prevents overlaps
  for (let i = 0; i < nominalItems.length; i++) {
    const item = nominalItems[i];
    
    // Deterministic jitter seeds
    const seed = hash32(item.id);
    const jxRaw = (halton(seed, 2) - 0.5) * (cfg.jitterX * 2);
    const ry = (halton(seed, 3) - 0.5) * (cfg.maxTiltY * 2);
    const tz = halton(seed, 5) * cfg.maxDepth;

    // Calculate local free gaps using nominal positions
    const leftGap = i === 0 ? Infinity : (item.x - (nominalItems[i-1].x + nominalItems[i-1].w));
    const rightGap = i === nominalItems.length - 1 ? Infinity : (nominalItems[i+1].x - (item.x + item.w));

    // Asymmetric clamp: use ≤40% of each gap
    const maxLeft = isFinite(leftGap) ? -leftGap * 0.40 : -1000;
    const maxRight = isFinite(rightGap) ? rightGap * 0.40 : 1000;
    const jx = Math.min(Math.max(jxRaw, maxLeft), maxRight);

    layoutItems.push({
      id: item.id,
      x: item.x + jx + centerOffset, // Apply centering offset
      y: yCursor + jy,
      w: item.w,
      h: item.h,
      d: item.d,
      ry,
      z: tz
    });
  }
}