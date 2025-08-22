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
      
      // Start new row
      yCursor += cfg.targetRowHeight + cfg.gutterY;
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
  
  // Calculate natural widths using physical proportions
  const H = cfg.targetRowHeight;
  let wsum = 0;
  const physicalWidths = rowBooks.map(book => {
    // Natural width at height H using physical aspect ratio
    const Wi = (book.phys.width_mm / book.phys.height_mm) * H;
    wsum += Wi;
    return Wi;
  });
  
  // Calculate scale factor for justification
  const totalGutterWidth = Math.max(0, rowBooks.length - 1) * cfg.gutterX;
  const usable = containerWidth - totalGutterWidth;
  let scale = usable / wsum;
  
  // Handle last row according to config
  if (isLastRow && cfg.raggedLastRow) {
    scale = Math.min(1, scale);
  }
  
  // Row waviness
  const jy = Math.sin(rowIndex * 1.3) * 4;
  
  // Position books in row
  let currentX = 0;
  
  // Create nominal positions first (no jitter)
  const nominalItems: Array<{id: string, w: number, h: number, d: number, x: number}> = [];
  let x = 0;
  
  for (let i = 0; i < rowBooks.length; i++) {
    const book = rowBooks[i];
    const Wi = physicalWidths[i];
    const Di = book.phys.spine_mm * (H / book.phys.height_mm);
    
    const w = Wi * scale;
    const h = H * scale;
    const d = Math.max(2, Di * scale);
    
    nominalItems.push({ id: book.id, w, h, d, x });
    x += w + cfg.gutterX;
  }
  
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
      x: item.x + jx,
      y: yCursor + jy,
      w: item.w,
      h: item.h,
      d: item.d,
      ry,
      z: tz
    });
  }
}