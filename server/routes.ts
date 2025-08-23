import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import express from "express";
import path from "path";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Standalone lookup function for background processing
async function lookupBookByISBN(isbn: string, userId: string) {
  // Clean ISBN: remove whitespace and hyphens for consistent processing
  isbn = isbn.trim().replace(/[\s\-]/g, '');
  
  // Get user's preferred region, fallback to default
  let amazonDomain = "amazon.com.au";
  try {
    const userPreferences = await storage.getUserPreferences(userId);
    amazonDomain = userPreferences?.amazonDomain || "amazon.com.au";
  } catch (error) {
    console.error("Failed to get user preferences:", error);
  }
  
  // Check if book already exists for this user
  const existingBook = await storage.getBookByIsbn(isbn, userId);
  if (existingBook) {
    throw new Error("Book already exists in your library");
  }

  // Call Rainforest API
  const apiKey = process.env.RAINFOREST_API_KEY || "92575A16923F492BA4F7A0CA68E40AA7";
  const rainforestUrl = `https://api.rainforestapi.com/request?api_key=${apiKey}&type=product&gtin=${isbn}&amazon_domain=${amazonDomain}`;
  
  const response = await fetch(rainforestUrl);
  
  if (!response.ok) {
    throw new Error("Book not found");
  }

  const data = await response.json();
  
  if (!data.product) {
    throw new Error("Book not found");
  }

  const product = data.product;
  
  // Extract all available cover images using comprehensive approach
  const collectImageUrls = (root: any) => {
    const urls = new Set<string>();

    // Helper: add if looks like an image
    const addIfImage = (u: any) => {
      if (typeof u === 'string' && /\.(avif|webp|png|jpe?g|gif|svg)(\?|#|$)/i.test(u)) {
        urls.add(u);
      }
    };

    // 1) Product-level
    addIfImage(root?.product?.main_image?.link);
    (root?.product?.images ?? []).forEach((img: any) => addIfImage(img?.link));

    // images_flat may be a single URL or comma-separated
    const flat = root?.product?.images_flat;
    if (typeof flat === 'string') {
      flat.split(',').map(s => s.trim()).forEach(addIfImage);
    }

    // 2) Reviews (potential alternative covers in review images)
    (root?.product?.top_reviews ?? []).forEach((r: any) => {
      // attached review images
      (r?.images ?? []).forEach((img: any) => addIfImage(img?.link));
      // video thumbnails (images)
      (r?.videos ?? []).forEach((v: any) => addIfImage(v?.image));
    });

    return Array.from(urls);
  };

  let coverImages = collectImageUrls(data);
  
  // Extract cover images from different variants (Kindle, Hardcover, Paperback, etc.)
  if (product.variants && Array.isArray(product.variants)) {
    console.log(`Found ${product.variants.length} variants, fetching cover images...`);
    
    for (const variant of product.variants.slice(0, 3)) { // Limit to 3 variants to avoid too many API calls
      if (variant.asin && variant.asin !== product.asin) {
        try {
          console.log(`Fetching variant cover for ${variant.title} (${variant.asin})`);
          const variantUrl = `https://api.rainforestapi.com/request?api_key=${apiKey}&type=product&asin=${variant.asin}&amazon_domain=${amazonDomain}`;
          const variantResponse = await fetch(variantUrl);
          
          if (variantResponse.ok) {
            const variantData = await variantResponse.json();
            
            if (variantData.product) {
              const variantImages = collectImageUrls(variantData);
              variantImages.forEach(img => {
                if (!coverImages.includes(img)) {
                  coverImages.push(img);
                }
              });
            }
          }
        } catch (variantError) {
          console.error(`Failed to fetch variant ${variant.asin}:`, variantError);
        }
      }
    }
  }

  // Enhanced data extraction
  let author = "Unknown Author";
  if (product.authors && product.authors.length > 0) {
    author = product.authors[0].name || product.authors[0];
  } else if (product.by_line && typeof product.by_line === 'string') {
    author = product.by_line.replace(/^by\s+/i, '').trim();
  } else if (product.brand && !product.brand.includes('Amazon') && !product.brand.includes('Publication')) {
    author = product.brand;
  }
  
  // Extract categories properly
  let categories: string[] = [];
  if (product.categories && Array.isArray(product.categories)) {
    categories = product.categories.map((cat: any) => {
      if (typeof cat === 'string') return cat;
      if (cat && cat.name) return cat.name;
      if (cat && cat.category) return cat.category;
      return null;
    }).filter(Boolean);
  } else if (product.category_path && Array.isArray(product.category_path)) {
    categories = product.category_path.map((cat: any) => cat.name || cat).filter(Boolean);
  }
  
  // Enhanced dimensions extraction - check multiple locations
  let extractedDimensions: string | null = null;
  
  // Check top-level dimensions field
  if (product.dimensions) {
    extractedDimensions = String(product.dimensions);
  }
  
  // Check specifications array (main location for dimensions)
  if (!extractedDimensions && product.specifications && Array.isArray(product.specifications)) {
    for (const spec of product.specifications) {
      if (spec && typeof spec === 'object') {
        if (spec.name && spec.value) {
          const name = String(spec.name).toLowerCase();
          if (name.includes('dimension')) {
            extractedDimensions = String(spec.value);
            break;
          }
        }
      }
    }
  }

  const parsedDimensions = parseAndAssignDimensions(extractedDimensions, product.title);

  return {
    isbn,
    title: product.title || "Unknown Title",
    author,
    coverImage: coverImages[0] || "",
    coverImages,
    selectedCoverIndex: 0,
    description: product.description || "",
    publishYear: product.publication_date ? new Date(product.publication_date).getFullYear() : null,
    publishDate: product.publication_date || null,
    publisher: product.publisher || null,
    language: product.language || "English",
    pages: product.pages ? parseInt(product.pages) : null,
    dimensions: extractedDimensions,
    weight: product.weight || null,
    rating: product.rating ? parseFloat(product.rating) : null,
    ratingsTotal: product.ratings_total ? parseInt(product.ratings_total) : null,
    categories,
    featureBullets: product.feature_bullets || [],
    amazonDomain,
    userId,
    status: "want-to-read",
    
    // Include comprehensive metadata
    aboutThisItem: product.about_this_item || [],
    bookDescription: product.book_description || null,
    editorialReviews: product.editorial_reviews || [],
    ratingBreakdown: product.rating_breakdown || null,
    topReviews: product.top_reviews || [],
    bestsellersRank: product.bestsellers_rank || [],
    alsoBought: product.also_bought || [],
    variants: product.variants || [],
    amazonData: data
  };
}

// Intelligent dimension parsing utility
function parseAndAssignDimensions(dimensionText: string | null, title?: string): {
  width: number | null;
  height: number | null;
  depth: number | null;
} {
  if (!dimensionText) {
    return { width: null, height: null, depth: null };
  }

  try {
    // Parse various dimension formats and detect units
    console.log('Parsing dimensions:', dimensionText, 'for book:', title);
    
    // First check if units are explicitly mentioned
    const isMetric = /cm|centimeter|millimeter/i.test(dimensionText);
    const isImperial = /inch|inches|in\b/i.test(dimensionText);
    
    // Parse the numbers
    const matches = dimensionText.match(/([\d.]+)\s*x\s*([\d.]+)\s*x\s*([\d.]+)/i);
    if (!matches) {
      return { width: null, height: null, depth: null };
    }
    
    let [, dim1Str, dim2Str, dim3Str] = matches;
    let dim1 = parseFloat(dim1Str);
    let dim2 = parseFloat(dim2Str);
    let dim3 = parseFloat(dim3Str);
    
    // Convert to inches based on explicit units or heuristics
    if (isMetric || (!isImperial && (dim1 > 15 || dim2 > 15 || dim3 > 15))) {
      console.log('Converting from metric to inches:', { dim1, dim2, dim3 });
      dim1 = dim1 / 2.54; // cm to inches
      dim2 = dim2 / 2.54;
      dim3 = dim3 / 2.54;
    } else {
      console.log('Using as inches (imperial or small values):', { dim1, dim2, dim3 });
    }
    
    // Amazon dimensions can vary in format. Use intelligent detection based on values.
    // The smallest dimension is usually depth (spine thickness)
    // For portrait books: height > width, for landscape books: width > height
    const dims = [dim1, dim2, dim3];
    dims.sort((a, b) => a - b);
    const [smallest, middle, largest] = dims;
    
    // Smallest dimension is typically depth/spine thickness
    let depth = smallest;
    
    // Determine width and height from the remaining two dimensions
    let width, height;
    const remaining = dims.filter(d => d !== smallest);
    if (remaining.length === 2) {
      const [smaller, larger] = remaining.sort((a, b) => a - b);
      
      // Use the original order from Amazon to determine width vs height
      // Find which of the original dimensions correspond to our smaller/larger values
      const originalDims = [dim1, dim2, dim3];
      const depthIndex = originalDims.indexOf(smallest);
      const remainingOriginal = originalDims.filter((_, index) => index !== depthIndex);
      
      // Amazon typically lists dimensions as Width × Height × Depth
      // So we should preserve the original relative order of the first two dimensions
      if (remainingOriginal.length === 2) {
        width = remainingOriginal[0];  // First dimension is width
        height = remainingOriginal[1]; // Second dimension is height
      } else {
        // Fallback to the original logic if we can't determine order
        width = smaller;
        height = larger;
      }
    } else {
      // Fallback if logic fails
      width = middle;
      height = largest;
    }
    
    // Detect coffee table books and handle their landscape orientation
    const isCoffeeTableBook = title && (
      /\bcoffee\b/i.test(title) ||
      /\bart\b/i.test(title) ||
      /\bphotography\b/i.test(title) ||
      /\bdesign\b/i.test(title) ||
      /\barchitecture\b/i.test(title) ||
      title.toLowerCase().includes('westography') // Specific case (keep as substring)
      // Note: Using word boundaries (\b) to avoid false positives like "Illustrated" containing "art"
    );
    
    // For coffee table books, ensure width > height (landscape orientation)
    if (isCoffeeTableBook && height > width) {
      console.log(`☕ Coffee table book detected: ${title}, swapping to landscape: w:${height}, h:${width}`);
      [width, height] = [height, width]; // Swap to make width > height
    }
    
    // Round to 2 decimal places
    return {
      width: Math.round(width * 100) / 100,
      height: Math.round(height * 100) / 100,
      depth: Math.round(depth * 100) / 100
    };
    
  } catch (error) {
    console.warn('Failed to parse book dimensions:', dimensionText, error);
    return { width: null, height: null, depth: null };
  }
}
import { insertBookSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";

// Global progress tracker for refresh operations
interface RefreshProgress {
  total: number;
  current: number;
  completed: string[];
  currentBook: string | null;
  errors: Array<{ book: string; error: string }>;
  status: 'running' | 'completed' | 'error' | 'paused' | 'stopped';
  isPaused: boolean;
  isStopped: boolean;
}

const progressStore = new Map<string, RefreshProgress>();
const progressClients = new Map<string, Set<any>>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve Scanbot SDK files statically (before auth middleware to avoid auth issues)
  app.get('/scanbot-sdk/*', (req, res, next) => {
    // Remove query parameters for file path resolution
    let filePath = req.path.replace('/scanbot-sdk/', '');
    
    // Handle specific Core files that need to be in bin/barcode-scanner/
    // Redirect both Core JS files and WASM files to the appropriate subdirectory
    if (!filePath.includes('/') && (
      (filePath.startsWith('ScanbotSDK.Core') && filePath.endsWith('.js')) ||
      (filePath.endsWith('.wasm'))
    )) {
      filePath = `bin/barcode-scanner/${filePath}`;
    }
    
    const fullPath = path.join(process.cwd(), 'client/public/scanbot-sdk', filePath);
    
    console.log(`Serving Scanbot file: ${req.path} -> ${fullPath}`);
    
    // Set proper MIME types
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.wasm')) {
      res.setHeader('Content-Type', 'application/wasm');
    }
    
    res.sendFile(fullPath, (err) => {
      if (err) {
        console.error('Error serving Scanbot file:', err);
        res.status(404).send('File not found');
      }
    });
  });

  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get all users for user switcher
  app.get('/api/auth/users', isAuthenticated, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // User switching for development/testing (skip auth check for this endpoint)
  app.post('/api/auth/switch-user/:userId', async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      console.log(`Attempting to switch to user: ${userId}`);
      
      // Verify the user exists in the database
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        console.log(`User not found: ${userId}`);
        return res.status(400).json({ message: "User not found" });
      }

      console.log(`Target user found:`, targetUser);

      // Create user claims based on database user
      const userClaims = {
        sub: targetUser.id,
        email: targetUser.email,
        first_name: targetUser.firstName,
        last_name: targetUser.lastName,
        profile_image_url: targetUser.profileImageUrl,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };

      // Update the user object in the request
      req.user = {
        claims: userClaims,
        access_token: req.user?.access_token || 'dev-token-' + targetUser.id,
        refresh_token: req.user?.refresh_token || 'dev-refresh-' + targetUser.id,
        expires_at: userClaims.exp,
      };

      // Also update the passport session user
      if (req.session.passport) {
        req.session.passport.user = req.user;
      } else {
        req.session.passport = { user: req.user };
      }

      console.log(`Updated session user:`, req.session.passport.user.claims);

      // Force session save to persist the user switch
      req.session.save((err: any) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to save session" });
        }
        
        console.log(`User successfully switched to ${targetUser.id} (${targetUser.firstName} - ${targetUser.email})`);
        res.json({ 
          message: "User switched successfully", 
          userId: targetUser.id,
          user: targetUser 
        });
      });
    } catch (error) {
      console.error("Error switching user:", error);
      res.status(500).json({ message: "Failed to switch user" });
    }
  });

  // User preferences routes
  app.get('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let preferences = await storage.getUserPreferences(userId);
      
      // Create default preferences if they don't exist
      if (!preferences) {
        preferences = await storage.createUserPreferences({
          userId,
          amazonDomain: "amazon.com.au",
          currency: "AUD",
          measurementUnit: "metric"
        });
      }
      
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ message: "Failed to fetch user preferences" });
    }
  });

  app.patch('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amazonDomain, currency, measurementUnit } = req.body;
      
      const updatedPreferences = await storage.updateUserPreferences(userId, {
        amazonDomain,
        currency,
        measurementUnit
      });
      
      if (!updatedPreferences) {
        return res.status(404).json({ message: "User preferences not found" });
      }
      
      res.json(updatedPreferences);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ message: "Failed to update user preferences" });
    }
  });
  // Get all books
  app.get("/api/books", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const books = await storage.getAllBooks(userId);
      res.json(books);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch books" });
    }
  });

  // Lookup book by ISBN using Rainforest API
  app.get("/api/books/lookup/:isbn", isAuthenticated, async (req: any, res) => {
    try {
      let { isbn } = req.params;
      // Clean ISBN: remove whitespace and hyphens for consistent processing
      isbn = isbn.trim().replace(/[\s\-]/g, '');
      const { region } = req.query;
      const userId = req.user.claims.sub;
      
      // Get user's preferred region, fallback to query param or default
      let amazonDomain = region as string;
      if (!amazonDomain) {
        const userPreferences = await storage.getUserPreferences(userId);
        amazonDomain = userPreferences?.amazonDomain || "amazon.com.au";
      }
      
      // Check if book already exists for this user
      const existingBook = await storage.getBookByIsbn(isbn, userId);
      if (existingBook) {
        return res.status(409).json({ 
          message: "Book already exists in your library",
          book: existingBook 
        });
      }

      // Call Rainforest API
      const apiKey = process.env.RAINFOREST_API_KEY || "92575A16923F492BA4F7A0CA68E40AA7";
      const rainforestUrl = `https://api.rainforestapi.com/request?api_key=${apiKey}&type=product&gtin=${isbn}&amazon_domain=${amazonDomain}`;
      
      const response = await fetch(rainforestUrl);
      
      if (!response.ok) {
        return res.status(404).json({ message: "Book not found" });
      }

      const data = await response.json();
      
      if (!data.product) {
        return res.status(404).json({ message: "Book not found" });
      }

      const product = data.product;
      
      // Enhanced data extraction
      console.log("Raw Rainforest API response:", JSON.stringify(data, null, 2));
      
      // Extract all available cover images using comprehensive approach
      const collectImageUrls = (root: any) => {
        const urls = new Set<string>();

        // Helper: add if looks like an image
        const addIfImage = (u: any) => {
          if (typeof u === 'string' && /\.(avif|webp|png|jpe?g|gif|svg)(\?|#|$)/i.test(u)) {
            urls.add(u);
          }
        };

        // 1) Product-level
        addIfImage(root?.product?.main_image?.link);
        (root?.product?.images ?? []).forEach((img: any) => addIfImage(img?.link));

        // images_flat may be a single URL or comma-separated
        const flat = root?.product?.images_flat;
        if (typeof flat === 'string') {
          flat.split(',').map(s => s.trim()).forEach(addIfImage);
        }

        // 2) Reviews (potential alternative covers in review images)
        (root?.product?.top_reviews ?? []).forEach((r: any) => {
          // attached review images
          (r?.images ?? []).forEach((img: any) => addIfImage(img?.link));
          // video thumbnails (images)
          (r?.videos ?? []).forEach((v: any) => addIfImage(v?.image));
          // reviewer avatar (skip these for covers)
          // addIfImage(r?.profile?.image);
        });

        return Array.from(urls);
      };

      let coverImages = collectImageUrls(data);
      
      // Extract cover images from different variants (Kindle, Hardcover, Paperback, etc.)
      if (product.variants && Array.isArray(product.variants)) {
        console.log(`Found ${product.variants.length} variants, fetching cover images...`);
        
        for (const variant of product.variants.slice(0, 4)) { // Limit to 4 variants to avoid too many API calls
          if (variant.asin && variant.asin !== product.asin) {
            try {
              console.log(`Fetching variant cover for ${variant.title} (${variant.asin})`);
              const variantUrl = `https://api.rainforestapi.com/request?api_key=${apiKey}&type=product&asin=${variant.asin}&amazon_domain=${amazonDomain}`;
              const variantResponse = await fetch(variantUrl);
              
              if (variantResponse.ok) {
                const variantData = await variantResponse.json();
                
                if (variantData.product) {
                  const variantImages = collectImageUrls(variantData);
                  variantImages.forEach(img => {
                    if (!coverImages.includes(img)) {
                      coverImages.push(img);
                    }
                  });
                }
              }
            } catch (variantError) {
              console.error(`Failed to fetch variant ${variant.asin}:`, variantError);
            }
          }
        }
      }
      
      console.log("Extracted cover images from all sources:", coverImages);
      
      // Extract author more comprehensively
      let author = "Unknown Author";
      if (product.authors && product.authors.length > 0) {
        author = product.authors[0].name || product.authors[0];
      } else if (product.by_line && typeof product.by_line === 'string') {
        author = product.by_line.replace(/^by\s+/i, '').trim();
      } else if (product.brand && !product.brand.includes('Amazon') && !product.brand.includes('Publication')) {
        author = product.brand;
      }
      
      // Enhanced dimensions extraction - check multiple locations
      let extractedDimensions: string | null = null;
      
      // Check top-level dimensions field
      if (product.dimensions) {
        extractedDimensions = String(product.dimensions);
      }
      
      // Check specifications array (main location for dimensions)
      if (!extractedDimensions && product.specifications && Array.isArray(product.specifications)) {
        for (const spec of product.specifications) {
          if (spec && typeof spec === 'object') {
            if (spec.name && spec.value) {
              const name = String(spec.name).toLowerCase();
              if (name.includes('dimension')) {
                extractedDimensions = String(spec.value);
                break;
              }
            }
          }
        }
      }
      
      // Check additional_details_flat array
      if (!extractedDimensions && product.additional_details_flat && Array.isArray(product.additional_details_flat)) {
        for (const detail of product.additional_details_flat) {
          if (detail && typeof detail === 'object') {
            if (detail.name && detail.value) {
              const name = String(detail.name).toLowerCase();
              if (name.includes('dimension') || name.includes('product dimension') || name.includes('package dimension')) {
                extractedDimensions = String(detail.value);
                break;
              }
            }
          }
        }
      }
      
      // Check specifications_flat array  
      if (!extractedDimensions && product.specifications_flat && Array.isArray(product.specifications_flat)) {
        for (const spec of product.specifications_flat) {
          if (spec && typeof spec === 'object') {
            if (spec.name && spec.value) {
              const name = String(spec.name).toLowerCase();
              if (name.includes('dimension') || name.includes('product dimension') || name.includes('package dimension')) {
                extractedDimensions = String(spec.value);
                break;
              }
            }
          }
        }
      }
      
      // Check nested product_details
      if (!extractedDimensions && product.product_details) {
        Object.entries(product.product_details as any).forEach(([key, value]) => {
          const lowerKey = key.toLowerCase();
          if ((lowerKey.includes('dimension') || lowerKey.includes('size')) && value && !extractedDimensions) {
            extractedDimensions = String(value);
          }
        });
      }
      
      // Check legacy specifications object
      if (!extractedDimensions && product.specifications) {
        const specs = product.specifications as any;
        if (specs.dimensions) {
          extractedDimensions = String(specs.dimensions);
        } else {
          Object.entries(specs).forEach(([key, value]) => {
            const lowerKey = key.toLowerCase();
            if ((lowerKey.includes('dimension') || lowerKey.includes('size')) && value && !extractedDimensions) {
              extractedDimensions = String(value);
            }
          });
        }
      }
      
      console.log('Extracted dimensions:', extractedDimensions);
      
      // Extract categories properly
      let categories: string[] = [];
      if (product.categories && Array.isArray(product.categories)) {
        categories = product.categories.map((cat: any) => {
          if (typeof cat === 'string') return cat;
          if (cat && cat.name) return cat.name;
          if (cat && cat.category) return cat.category;
          return null;
        }).filter(Boolean);
      } else if (product.category_path && Array.isArray(product.category_path)) {
        categories = product.category_path.map((cat: any) => cat.name || cat).filter(Boolean);
      }
      
      // Extract feature bullets
      let featureBullets: string[] = [];
      if (product.feature_bullets && Array.isArray(product.feature_bullets)) {
        featureBullets = product.feature_bullets.filter((bullet: any) => typeof bullet === 'string' && bullet.trim());
      }
      
      // Extract dimensions and weight more reliably
      let dimensions: string | null = null;
      let weight: string | null = null;
      
      if (product.specifications) {
        const specs = product.specifications as any;
        if (specs.dimensions) dimensions = String(specs.dimensions);
        if (specs.weight) weight = String(specs.weight);
        
        // Also check in other common spec locations
        Object.values(specs).forEach((spec: any) => {
          if (typeof spec === 'object' && spec) {
            if (spec.dimensions && !dimensions) dimensions = String(spec.dimensions);
            if (spec.weight && !weight) weight = String(spec.weight);
          }
        });
      }
      
      // Check product details for additional info
      if (product.product_details) {
        const details = product.product_details as any;
        Object.entries(details).forEach(([key, value]) => {
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes('dimension') && !dimensions) dimensions = String(value);
          if (lowerKey.includes('weight') && !weight) weight = String(value);
        });
      }
      
      const bookData = {
        isbn,
        asin: product.asin || null,
        title: product.title || "Unknown Title",
        author: author,
        description: product.description || featureBullets.join(". ") || "",
        coverImage: coverImages[0] || "",
        coverImages: coverImages,
        selectedCoverIndex: 0,
        publishYear: product.publication_date ? new Date(product.publication_date).getFullYear() : null,
        publishDate: product.publication_date || null,
        publisher: product.publisher || null,
        language: product.language || null,
        pages: product.pages || product.number_of_pages || null,
        dimensions: extractedDimensions || dimensions || product.dimensions || null,
        weight: weight || product.weight || null,
        rating: product.rating?.toString() || product.average_rating?.toString() || null,
        ratingsTotal: product.ratings_total || product.rating_breakdown?.total || null,
        reviewsTotal: product.reviews_total || null,
        price: product.price?.raw || product.price?.value || product.price || null,
        originalPrice: product.original_price?.raw || product.original_price?.value || product.original_price || null,
        categories: categories,
        featureBullets: featureBullets,
        availability: product.availability?.raw || product.availability || product.in_stock ? "In Stock" : null,
        amazonDomain: amazonDomain,
        userId: userId,
        status: "want-to-read",
        
        // Add comprehensive metadata fields that refresh endpoint fetches
        aboutThisItem: product.about_this_item || null,
        bookDescription: product.book_description || product.description || null,
        editorialReviews: product.editorial_reviews || null,
        ratingBreakdown: product.rating_breakdown || null,
        topReviews: product.top_reviews || null,
        bestsellersRank: product.bestsellers_rank || null,
        alsoBought: product.also_bought || null,
        variants: product.variants || null,
        amazonData: data // Store full API response for future reference
      };
      
      console.log("Processed book data:", JSON.stringify(bookData, null, 2));

      res.json(bookData);
    } catch (error) {
      console.error("ISBN lookup error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to lookup book", error: errorMessage });
    }
  });

  // Add book to library
  app.post("/api/books", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertBookSchema.parse(req.body);
      
      // Get user details to check subscription status and book count
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check subscription limits
      const currentBookCount = user.bookCount || 0;
      const isSubscribed = user.subscriptionStatus === 'active';
      
      // Enforce 100-book limit for free users
      if (currentBookCount >= 100 && !isSubscribed) {
        return res.status(402).json({ 
          message: "You've reached the 100-book limit for free accounts. Subscribe to Shelfie Pro to continue adding books.",
          requiresSubscription: true,
          bookCount: currentBookCount
        });
      }
      
      // Check if book already exists for this user
      const existingBook = await storage.getBookByIsbn(validatedData.isbn, userId);
      if (existingBook) {
        return res.status(409).json({ 
          message: "Book already exists in your library",
          book: existingBook 
        });
      }

      const book = await storage.createBook({ ...validatedData, userId });
      
      // Increment user's book count for subscription tracking
      await storage.incrementUserBookCount(userId);
      
      res.status(201).json(book);
    } catch (error) {
      console.error("Error adding book to library:", error);
      console.error("Request body:", JSON.stringify(req.body, null, 2));
      console.error("User ID:", req.user?.claims?.sub);
      
      if (error instanceof z.ZodError) {
        console.error("Zod validation errors:", error.errors);
        res.status(400).json({ message: "Invalid book data", errors: error.errors });
      } else {
        console.error("Non-Zod error:", error);
        res.status(500).json({ message: "Failed to add book", error: (error as Error).message });
      }
    }
  });

  // Update book data
  app.patch("/api/books/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const updateData = req.body;
      
      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData.isbn;
      delete updateData.addedAt;
      delete updateData.userId;

      const updatedBook = await storage.updateBookData(id, updateData, userId);
      
      if (!updatedBook) {
        return res.status(404).json({ message: "Book not found" });
      }

      res.json(updatedBook);
    } catch (error) {
      res.status(500).json({ message: "Failed to update book" });
    }
  });

  // Update book status
  app.patch("/api/books/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.claims.sub;
      
      if (!["want-to-read", "reading", "read"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updatedBook = await storage.updateBookStatus(id, status, userId);
      
      if (!updatedBook) {
        return res.status(404).json({ message: "Book not found" });
      }

      res.json(updatedBook);
    } catch (error) {
      res.status(500).json({ message: "Failed to update book status" });
    }
  });

  // Update selected cover image
  app.patch("/api/books/:id/cover", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { selectedCoverIndex } = req.body;
      const userId = req.user.claims.sub;
      
      if (typeof selectedCoverIndex !== 'number' || selectedCoverIndex < 0) {
        return res.status(400).json({ message: "Invalid cover index" });
      }
      
      const book = await storage.getBook(id, userId);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      
      if (!book.coverImages || selectedCoverIndex >= book.coverImages.length) {
        return res.status(400).json({ message: "Cover index out of range" });
      }
      
      const updatedBook = await storage.updateBookData(id, {
        selectedCoverIndex,
        coverImage: book.coverImages[selectedCoverIndex] // Update the main coverImage too
      }, userId);
      
      res.json(updatedBook);
    } catch (error) {
      console.error("Cover update error:", error);
      res.status(500).json({ message: "Failed to update cover selection" });
    }
  });

  // Upload cropped cover image - POST /api/books/:id/crop-cover
  app.post("/api/books/:id/crop-cover", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { croppedImageData, originalImageUrl } = req.body;
      const userId = req.user.claims.sub;
      
      const book = await storage.getBook(id, userId);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      
      // Store the cropped image data directly in the storage system
      // This creates a data URL that can be used directly by the browser
      const croppedImageUrl = croppedImageData;
      
      // Update the book with the new cropped image
      const updatedBook = await storage.updateBookData(id, {
        coverImage: croppedImageUrl,
        // Add to cover images if not already present
        coverImages: book.coverImages 
          ? [...book.coverImages, croppedImageUrl]
          : [croppedImageUrl]
      }, userId);
      
      res.json({ 
        success: true, 
        croppedImageUrl,
        book: updatedBook 
      });
    } catch (error) {
      console.error("Crop image error:", error);
      res.status(500).json({ message: "Failed to save cropped image" });
    }
  });

  // Refresh book data from API
  app.patch("/api/books/:id/refresh", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Get existing book
      const existingBook = await storage.getBook(id, userId);
      if (!existingBook) {
        return res.status(404).json({ message: "Book not found" });
      }

      // Call Rainforest API with fresh lookup using the book's stored region
      const apiKey = process.env.RAINFOREST_API_KEY || "92575A16923F492BA4F7A0CA68E40AA7";
      const amazonDomain = existingBook.amazonDomain || "amazon.com.au"; // Use stored region or default to Australia
      const rainforestUrl = `https://api.rainforestapi.com/request?api_key=${apiKey}&type=product&gtin=${existingBook.isbn}&amazon_domain=${amazonDomain}`;
      
      const response = await fetch(rainforestUrl);
      
      if (!response.ok) {
        return res.status(400).json({ message: "Failed to refresh book data" });
      }

      const data = await response.json();
      
      if (!data.product) {
        return res.status(400).json({ message: "No updated data available" });
      }

      const product = data.product;
      
      // Extract all available cover images using comprehensive approach
      const collectImageUrls = (root: any) => {
        const urls = new Set<string>();

        // Helper: add if looks like an image
        const addIfImage = (u: any) => {
          if (typeof u === 'string' && /\.(avif|webp|png|jpe?g|gif|svg)(\?|#|$)/i.test(u)) {
            urls.add(u);
          }
        };

        // 1) Product-level
        addIfImage(root?.product?.main_image?.link);
        (root?.product?.images ?? []).forEach((img: any) => addIfImage(img?.link));

        // images_flat may be a single URL or comma-separated
        const flat = root?.product?.images_flat;
        if (typeof flat === 'string') {
          flat.split(',').map(s => s.trim()).forEach(addIfImage);
        }

        // 2) Reviews (potential alternative covers in review images)
        (root?.product?.top_reviews ?? []).forEach((r: any) => {
          // attached review images
          (r?.images ?? []).forEach((img: any) => addIfImage(img?.link));
          // video thumbnails (images)
          (r?.videos ?? []).forEach((v: any) => addIfImage(v?.image));
        });

        return Array.from(urls);
      };

      let coverImages = collectImageUrls(data);
      
      // Extract cover images from different variants (Kindle, Hardcover, Paperback, etc.)
      if (product.variants && Array.isArray(product.variants)) {
        console.log(`Found ${product.variants.length} variants for refresh, fetching cover images...`);
        
        for (const variant of product.variants.slice(0, 4)) { // Limit to 4 variants to avoid too many API calls
          if (variant.asin && variant.asin !== product.asin) {
            try {
              console.log(`Fetching variant cover for ${variant.title} (${variant.asin})`);
              const variantUrl = `https://api.rainforestapi.com/request?api_key=${apiKey}&type=product&asin=${variant.asin}&amazon_domain=${amazonDomain}`;
              const variantResponse = await fetch(variantUrl);
              
              if (variantResponse.ok) {
                const variantData = await variantResponse.json();
                
                if (variantData.product) {
                  const variantImages = collectImageUrls(variantData);
                  variantImages.forEach(img => {
                    if (!coverImages.includes(img)) {
                      coverImages.push(img);
                    }
                  });
                }
              }
            } catch (variantError) {
              console.error(`Failed to fetch variant ${variant.asin}:`, variantError);
            }
          }
        }
      }
      
      console.log("Extracted cover images for refresh:", coverImages);
      
      // Apply the same enhanced extraction logic
      let author = "Unknown Author";
      if (product.authors && product.authors.length > 0) {
        author = product.authors[0].name || product.authors[0];
      } else if (product.by_line && typeof product.by_line === 'string') {
        author = product.by_line.replace(/^by\s+/i, '').trim();
      } else if (product.brand && !product.brand.includes('Amazon') && !product.brand.includes('Publication')) {
        author = product.brand;
      }
      
      // Extract categories properly
      let categories: string[] = [];
      if (product.categories && Array.isArray(product.categories)) {
        categories = product.categories.map((cat: any) => {
          if (typeof cat === 'string') return cat;
          if (cat && cat.name) return cat.name;
          if (cat && cat.category) return cat.category;
          return null;
        }).filter(Boolean);
      } else if (product.category_path && Array.isArray(product.category_path)) {
        categories = product.category_path.map((cat: any) => cat.name || cat).filter(Boolean);
      }
      
      // Enhanced dimensions extraction - check multiple locations
      let extractedDimensions: string | null = null;
      
      // Check top-level dimensions field
      if (product.dimensions) {
        extractedDimensions = String(product.dimensions);
      }
      
      // Check additional_details_flat array
      if (!extractedDimensions && product.additional_details_flat && Array.isArray(product.additional_details_flat)) {
        for (const detail of product.additional_details_flat) {
          if (detail && typeof detail === 'object') {
            if (detail.name && detail.value) {
              const name = String(detail.name).toLowerCase();
              if (name.includes('dimension') || name.includes('product dimension') || name.includes('package dimension')) {
                extractedDimensions = String(detail.value);
                break;
              }
            }
          }
        }
      }
      
      // Check specifications array (main location for dimensions)
      if (!extractedDimensions && product.specifications && Array.isArray(product.specifications)) {
        for (const spec of product.specifications) {
          if (spec && typeof spec === 'object') {
            if (spec.name && spec.value) {
              const name = String(spec.name).toLowerCase();
              if (name.includes('dimension')) {
                extractedDimensions = String(spec.value);
                break;
              }
            }
          }
        }
      }
      
      // Check specifications_flat array  
      if (!extractedDimensions && product.specifications_flat && Array.isArray(product.specifications_flat)) {
        for (const spec of product.specifications_flat) {
          if (spec && typeof spec === 'object') {
            if (spec.name && spec.value) {
              const name = String(spec.name).toLowerCase();
              if (name.includes('dimension') || name.includes('product dimension') || name.includes('package dimension')) {
                extractedDimensions = String(spec.value);
                break;
              }
            }
          }
        }
      }
      
      // Check nested product_details
      if (!extractedDimensions && product.product_details) {
        Object.entries(product.product_details as any).forEach(([key, value]) => {
          const lowerKey = key.toLowerCase();
          if ((lowerKey.includes('dimension') || lowerKey.includes('size')) && value && !extractedDimensions) {
            extractedDimensions = String(value);
          }
        });
      }
      
      // Check legacy specifications object
      if (!extractedDimensions && product.specifications) {
        const specs = product.specifications as any;
        if (specs.dimensions) {
          extractedDimensions = String(specs.dimensions);
        } else {
          Object.entries(specs).forEach(([key, value]) => {
            const lowerKey = key.toLowerCase();
            if ((lowerKey.includes('dimension') || lowerKey.includes('size')) && value && !extractedDimensions) {
              extractedDimensions = String(value);
            }
          });
        }
      }

      // If no dimensions found and product is digital (audiobook/ebook), check physical variants
      if (!extractedDimensions && product.variants && Array.isArray(product.variants)) {
        const physicalFormats = ['hardcover', 'paperback', 'mass market paperback', 'library binding'];
        
        for (const variant of product.variants) {
          if (variant && variant.title) {
            const variantTitle = variant.title.toLowerCase();
            if (physicalFormats.some(format => variantTitle.includes(format))) {
              console.log(`Found physical variant: ${variant.title} (ASIN: ${variant.asin})`);
              
              // Make API call to get variant's detailed specifications
              try {
                const variantUrl = `https://api.rainforestapi.com/request?api_key=${apiKey}&type=product&asin=${variant.asin}&amazon_domain=${amazonDomain}`;
                const variantResponse = await fetch(variantUrl);
                
                if (variantResponse.ok) {
                  const variantData = await variantResponse.json();
                  
                  if (variantData.product && variantData.product.specifications) {
                    for (const spec of variantData.product.specifications) {
                      if (spec && typeof spec === 'object' && spec.name && spec.value) {
                        const name = String(spec.name).toLowerCase();
                        if (name.includes('dimension')) {
                          extractedDimensions = String(spec.value);
                          console.log(`Found dimensions in ${variant.title}: ${extractedDimensions}`);
                          break;
                        }
                      }
                    }
                  }
                }
              } catch (variantError) {
                console.error(`Failed to fetch variant ${variant.asin}:`, variantError);
              }
              
              // If we found dimensions, break out of variant loop
              if (extractedDimensions) break;
            }
          }
        }
      }

      // Parse individual dimensions intelligently
      const finalDimensions = extractedDimensions || product.dimensions || existingBook.dimensions;
      const parsedDimensions = parseAndAssignDimensions(finalDimensions, existingBook.title);
      
      console.log(`Refreshing book ${existingBook.title}: dimensions = ${finalDimensions}, parsed = w:${parsedDimensions.width}, h:${parsedDimensions.height}, d:${parsedDimensions.depth}, author = ${author}`);

      // Update the book with fresh data
      const updatedBook = await storage.updateBookData(id, {
        author,
        description: product.description || product.feature_bullets?.join(". ") || existingBook.description,
        coverImage: coverImages[0] || existingBook.coverImage,
        coverImages: coverImages.length > 0 ? coverImages : existingBook.coverImages,
        selectedCoverIndex: existingBook.selectedCoverIndex, // Keep user's selection
        publishYear: product.publication_date ? new Date(product.publication_date).getFullYear() : existingBook.publishYear,
        publishDate: product.publication_date || existingBook.publishDate,
        publisher: product.publisher || existingBook.publisher,
        language: product.language || existingBook.language,
        pages: product.pages || product.number_of_pages || existingBook.pages,
        dimensions: finalDimensions,
        width: parsedDimensions.width?.toString() || null,
        height: parsedDimensions.height?.toString() || null,
        depth: parsedDimensions.depth?.toString() || null,
        weight: product.weight || existingBook.weight,
        rating: product.rating?.toString() || product.average_rating?.toString() || existingBook.rating,
        ratingsTotal: product.ratings_total || product.rating_breakdown?.total || existingBook.ratingsTotal,
        categories: categories.length > 0 ? categories : existingBook.categories,
        featureBullets: product.feature_bullets || existingBook.featureBullets,
        
        // New comprehensive API fields
        aboutThisItem: product.about_this_item || null,
        bookDescription: product.book_description || product.description || null,
        editorialReviews: product.editorial_reviews || null,
        ratingBreakdown: product.rating_breakdown || null,
        topReviews: product.top_reviews || null,
        bestsellersRank: product.bestsellers_rank || null,
        alsoBought: product.also_bought || null,
        variants: product.variants || null,
        amazonData: data, // Store full API response for future reference
      }, userId);
      
      if (!updatedBook) {
        return res.status(404).json({ message: "Failed to update book" });
      }

      res.json(updatedBook);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Book refresh error:", error);
      res.status(500).json({ message: "Failed to refresh book data", error: errorMessage });
    }
  });

  // Progress tracking endpoint (Server-Sent Events)
  app.get("/api/refresh-progress", isAuthenticated, (req: any, res) => {
    const userId = req.user.claims.sub;
    
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Add client to progress tracking
    if (!progressClients.has(userId)) {
      progressClients.set(userId, new Set());
    }
    progressClients.get(userId)!.add(res);

    // Send current progress if exists
    const currentProgress = progressStore.get(userId);
    if (currentProgress) {
      res.write(`data: ${JSON.stringify(currentProgress)}\n\n`);
    }

    // Clean up on client disconnect
    req.on('close', () => {
      const clients = progressClients.get(userId);
      if (clients) {
        clients.delete(res);
        if (clients.size === 0) {
          progressClients.delete(userId);
        }
      }
    });
  });

  // Refresh all books with progress tracking
  app.post("/api/books/refresh-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allBooks = await storage.getAllBooks(userId);
      const apiKey = process.env.RAINFOREST_API_KEY || "92575A16923F492BA4F7A0CA68E40AA7";
      
      // Redirect to progress page immediately
      res.json({ 
        message: "Refresh started", 
        redirectTo: "/refresh-progress",
        totalBooks: allBooks.length 
      });

      // Initialize progress tracking
      const progress: RefreshProgress = {
        total: allBooks.length,
        current: 0,
        completed: [],
        currentBook: null,
        errors: [],
        status: 'running',
        isPaused: false,
        isStopped: false
      };
      
      progressStore.set(userId, progress);
      
      // Helper function to broadcast progress updates
      const broadcastProgress = () => {
        const clients = progressClients.get(userId);
        if (clients) {
          const data = `data: ${JSON.stringify(progress)}\n\n`;
          clients.forEach(client => {
            try {
              client.write(data);
            } catch (error) {
              clients.delete(client);
            }
          });
        }
      };

      console.log(`Starting refresh of ${allBooks.length} books for user ${userId}...`);
      broadcastProgress();
      
      // Process books asynchronously
      setImmediate(async () => {
        const refreshedBooks = [];
        
        for (const book of allBooks) {
          // Check if operation should be stopped or paused
          if (progress.isStopped) {
            progress.status = 'stopped';
            progress.currentBook = null;
            broadcastProgress();
            console.log(`Refresh operation stopped by user at ${progress.current}/${progress.total} books`);
            return;
          }
          
          // Wait while paused
          while (progress.isPaused && !progress.isStopped) {
            await new Promise(resolve => setTimeout(resolve, 500)); // Check every 500ms
          }
          
          // Check again if stopped while paused
          if (progress.isStopped) {
            progress.status = 'stopped';
            progress.currentBook = null;
            broadcastProgress();
            console.log(`Refresh operation stopped by user at ${progress.current}/${progress.total} books`);
            return;
          }
          
          progress.currentBook = book.title;
          broadcastProgress();
          
          try {
          // Call Rainforest API for fresh data using book's stored region
          const amazonDomain = book.amazonDomain || "amazon.com.au"; // Use stored region or default to Australia
          const rainforestUrl = `https://api.rainforestapi.com/request?api_key=${apiKey}&type=product&gtin=${book.isbn}&amazon_domain=${amazonDomain}`;
          const response = await fetch(rainforestUrl);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.product) {
              const product = data.product;
              
              // Extract all available cover images using comprehensive approach
              const collectImageUrls = (root: any) => {
                const urls = new Set<string>();

                // Helper: add if looks like an image
                const addIfImage = (u: any) => {
                  if (typeof u === 'string' && /\.(avif|webp|png|jpe?g|gif|svg)(\?|#|$)/i.test(u)) {
                    urls.add(u);
                  }
                };

                // 1) Product-level
                addIfImage(root?.product?.main_image?.link);
                (root?.product?.images ?? []).forEach((img: any) => addIfImage(img?.link));

                // images_flat may be a single URL or comma-separated
                const flat = root?.product?.images_flat;
                if (typeof flat === 'string') {
                  flat.split(',').map(s => s.trim()).forEach(addIfImage);
                }

                // 2) Reviews (potential alternative covers in review images)
                (root?.product?.top_reviews ?? []).forEach((r: any) => {
                  // attached review images
                  (r?.images ?? []).forEach((img: any) => addIfImage(img?.link));
                  // video thumbnails (images)
                  (r?.videos ?? []).forEach((v: any) => addIfImage(v?.image));
                });

                return Array.from(urls);
              };

              let coverImages = collectImageUrls(data);
              
              // Extract cover images from different variants (Kindle, Hardcover, Paperback, etc.)
              if (product.variants && Array.isArray(product.variants)) {
                console.log(`Found ${product.variants.length} variants for refresh-all, fetching cover images...`);
                
                for (const variant of product.variants.slice(0, 2)) { // Limit to 2 variants for refresh-all to avoid too many API calls
                  if (variant.asin && variant.asin !== product.asin) {
                    try {
                      console.log(`Fetching variant cover for ${variant.title} (${variant.asin})`);
                      const variantUrl = `https://api.rainforestapi.com/request?api_key=${apiKey}&type=product&asin=${variant.asin}&amazon_domain=${amazonDomain}`;
                      const variantResponse = await fetch(variantUrl);
                      
                      if (variantResponse.ok) {
                        const variantData = await variantResponse.json();
                        
                        if (variantData.product) {
                          const variantImages = collectImageUrls(variantData);
                          variantImages.forEach(img => {
                            if (!coverImages.includes(img)) {
                              coverImages.push(img);
                            }
                          });
                        }
                      }
                    } catch (variantError) {
                      console.error(`Failed to fetch variant ${variant.asin}:`, variantError);
                    }
                  }
                }
              }
              
              console.log("Extracted cover images for refresh-all:", coverImages);
              
              // Apply the same enhanced extraction logic
              let author = "Unknown Author";
              if (product.authors && product.authors.length > 0) {
                author = product.authors[0].name || product.authors[0];
              } else if (product.by_line && typeof product.by_line === 'string') {
                author = product.by_line.replace(/^by\s+/i, '').trim();
              } else if (product.brand && !product.brand.includes('Amazon') && !product.brand.includes('Publication')) {
                author = product.brand;
              }
              
              // Extract categories properly
              let categories: string[] = [];
              if (product.categories && Array.isArray(product.categories)) {
                categories = product.categories.map((cat: any) => {
                  if (typeof cat === 'string') return cat;
                  if (cat && cat.name) return cat.name;
                  if (cat && cat.category) return cat.category;
                  return null;
                }).filter(Boolean);
              } else if (product.category_path && Array.isArray(product.category_path)) {
                categories = product.category_path.map((cat: any) => cat.name || cat).filter(Boolean);
              }
              
              // Enhanced dimensions extraction - check multiple locations
              let extractedDimensions: string | null = null;
              
              // Check specifications array (main location for dimensions)
              if (!extractedDimensions && product.specifications && Array.isArray(product.specifications)) {
                for (const spec of product.specifications) {
                  if (spec && typeof spec === 'object') {
                    if (spec.name && spec.value) {
                      const name = String(spec.name).toLowerCase();
                      if (name.includes('dimension')) {
                        extractedDimensions = String(spec.value);
                        break;
                      }
                    }
                  }
                }
              }
              
              // If no dimensions found and product is digital (audiobook/ebook), check physical variants
              if (!extractedDimensions && product.variants && Array.isArray(product.variants)) {
                const physicalFormats = ['hardcover', 'paperback', 'mass market paperback', 'library binding'];
                
                for (const variant of product.variants) {
                  if (variant && variant.title) {
                    const variantTitle = variant.title.toLowerCase();
                    if (physicalFormats.some(format => variantTitle.includes(format))) {
                      console.log(`Found physical variant: ${variant.title} (ASIN: ${variant.asin})`);
                      
                      // Make API call to get variant's detailed specifications
                      try {
                        const variantUrl = `https://api.rainforestapi.com/request?api_key=${apiKey}&type=product&asin=${variant.asin}&amazon_domain=${amazonDomain}`;
                        const variantResponse = await fetch(variantUrl);
                        
                        if (variantResponse.ok) {
                          const variantData = await variantResponse.json();
                          
                          if (variantData.product && variantData.product.specifications) {
                            for (const spec of variantData.product.specifications) {
                              if (spec && typeof spec === 'object' && spec.name && spec.value) {
                                const name = String(spec.name).toLowerCase();
                                if (name.includes('dimension')) {
                                  extractedDimensions = String(spec.value);
                                  console.log(`Found dimensions in ${variant.title}: ${extractedDimensions}`);
                                  break;
                                }
                              }
                            }
                          }
                        }
                      } catch (variantError) {
                        console.error(`Failed to fetch variant ${variant.asin}:`, variantError);
                      }
                      
                      // If we found dimensions, break out of variant loop
                      if (extractedDimensions) break;
                    }
                  }
                }
              }
              
              // Extract feature bullets
              let featureBullets: string[] = [];
              if (product.feature_bullets && Array.isArray(product.feature_bullets)) {
                featureBullets = product.feature_bullets.filter((bullet: any) => typeof bullet === 'string' && bullet.trim());
              }
              
              // Parse individual dimensions intelligently  
              const finalDimensions = extractedDimensions || book.dimensions;
              console.log(`Final dimensions for ${book.title}: "${finalDimensions}"`);
              const parsedDimensions = parseAndAssignDimensions(finalDimensions, book.title);
              
              const updateData = {
                title: product.title || book.title,
                author: author,
                description: product.description || featureBullets.join(". ") || book.description,
                coverImage: coverImages[0] || book.coverImage,
                coverImages: coverImages.length > 0 ? coverImages : book.coverImages,
                selectedCoverIndex: book.selectedCoverIndex, // Keep user's selection
                publishYear: product.publication_date ? new Date(product.publication_date).getFullYear() : book.publishYear,
                publishDate: product.publication_date || book.publishDate,
                publisher: product.publisher || book.publisher,
                language: product.language || book.language,
                rating: product.rating?.toString() || book.rating,
                ratingsTotal: product.rating_breakdown?.five_star?.count || book.ratingsTotal,
                categories: categories.length > 0 ? categories : book.categories,
                featureBullets: featureBullets.length > 0 ? featureBullets : book.featureBullets,
                dimensions: finalDimensions,
                width: parsedDimensions.width?.toString() || null,
                height: parsedDimensions.height?.toString() || null,
                depth: parsedDimensions.depth?.toString() || null,
                
                // New comprehensive API fields for refresh-all
                aboutThisItem: product.about_this_item || null,
                bookDescription: product.book_description || product.description || null,
                editorialReviews: product.editorial_reviews || null,
                ratingBreakdown: product.rating_breakdown || null,
                topReviews: product.top_reviews || null,
                bestsellersRank: product.bestsellers_rank || null,
                alsoBought: product.also_bought || null,
                variants: product.variants || null,
                amazonData: data, // Store full API response for future reference
              };
              
              const updatedBook = await storage.updateBookData(book.id, updateData, userId);
              if (updatedBook) {
                refreshedBooks.push(updatedBook);
                console.log(`Refreshed: ${book.title} -> dimensions: ${finalDimensions}, parsed: w:${parsedDimensions.width}, h:${parsedDimensions.height}, d:${parsedDimensions.depth}, author: ${author}`);
              }
            } else {
              // Keep original book if no product data
              refreshedBooks.push(book);
              console.log(`No product data for: ${book.title}`);
            }
          } else {
            // Keep original book if API call fails
            refreshedBooks.push(book);
            console.log(`API call failed for: ${book.title}`);
          }
        } catch (error) {
          console.error(`Failed to refresh book ${book.title}:`, error);
          progress.errors.push({ book: book.title, error: error instanceof Error ? error.message : 'Unknown error' });
          refreshedBooks.push(book);
        }
        
        // Update progress
        progress.current++;
        progress.completed.push(book.title);
        broadcastProgress();
      }
      
      // Mark as completed
      progress.status = 'completed';
      progress.currentBook = null;
      broadcastProgress();
      
      console.log(`Completed refresh of ${refreshedBooks.length} books for user ${userId}`);
      
      // Clean up progress after 5 minutes
      setTimeout(() => {
        progressStore.delete(userId);
      }, 300000);
    });
      
    } catch (error) {
      console.error('Failed to start refresh operation:', error);
      res.status(500).json({ message: "Failed to start refresh" });
    }
  });

  // Control refresh progress (pause/resume/stop)
  app.post("/api/refresh-control", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { action } = req.body; // 'pause', 'resume', or 'stop'
      
      const progress = progressStore.get(userId);
      if (!progress) {
        return res.status(404).json({ message: "No active refresh operation found" });
      }
      
      switch (action) {
        case 'pause':
          if (progress.status === 'running') {
            progress.isPaused = true;
            progress.status = 'paused';
            console.log(`Refresh operation paused by user at ${progress.current}/${progress.total} books`);
          }
          break;
          
        case 'resume':
          if (progress.status === 'paused') {
            progress.isPaused = false;
            progress.status = 'running';
            console.log(`Refresh operation resumed by user at ${progress.current}/${progress.total} books`);
          }
          break;
          
        case 'stop':
          progress.isStopped = true;
          progress.isPaused = false;
          progress.status = 'stopped';
          progress.currentBook = null;
          console.log(`Refresh operation stopped by user at ${progress.current}/${progress.total} books`);
          break;
          
        default:
          return res.status(400).json({ message: "Invalid action. Use 'pause', 'resume', or 'stop'" });
      }
      
      // Broadcast updated progress
      const clients = progressClients.get(userId);
      if (clients) {
        const data = `data: ${JSON.stringify(progress)}\n\n`;
        clients.forEach(client => {
          try {
            client.write(data);
          } catch (error) {
            clients.delete(client);
          }
        });
      }
      
      res.json({ 
        message: `Refresh operation ${action}d successfully`,
        status: progress.status 
      });
      
    } catch (error) {
      console.error('Failed to control refresh operation:', error);
      res.status(500).json({ message: "Failed to control refresh operation" });
    }
  });

  // Delete book
  app.delete("/api/books/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteBook(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Book not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete book" });
    }
  });

  // Subscription API routes
  
  // Get user details including subscription status and book count
  app.get("/api/user/details", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get actual book count from database to ensure accuracy
      const books = await storage.getAllBooks(userId);
      const actualBookCount = books.length;
      
      // Update user record if book count doesn't match
      if (user.bookCount !== actualBookCount) {
        console.log(`Updating book count for user ${userId}: ${user.bookCount} -> ${actualBookCount}`);
        const updatedUser = await storage.updateUserBookCount(userId, actualBookCount);
        if (updatedUser) {
          Object.assign(user, updatedUser);
        }
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.status(500).json({ message: "Failed to fetch user details" });
    }
  });
  
  // Create Stripe subscription for user who reached 100+ books
  app.post("/api/create-subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.email) {
        return res.status(400).json({ message: "User email is required for subscription" });
      }
      
      let customerId = user.stripeCustomerId;
      
      // Create Stripe customer if not exists
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email,
          metadata: {
            userId: userId
          }
        });
        
        customerId = customer.id;
        await storage.updateUserSubscription(userId, { stripeCustomerId: customerId });
      }
      
      // Create Stripe Checkout session for annual subscription
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Shelfie Pro - Annual Subscription',
              description: 'Unlimited books, barcode scanning, and 3D visualization',
              images: ['https://via.placeholder.com/400x300?text=Shelfie+Pro']
            },
            recurring: {
              interval: 'year'
            },
            unit_amount: 1700, // $17.00 in cents
          },
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${req.protocol}://${req.get('host')}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get('host')}/subscription?cancelled=true`,
        metadata: {
          userId: userId
        }
      });
      
      res.json({ sessionId: session.id });
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });
  
  // TEST ENDPOINT: Simulate successful subscription (for testing)
  app.post("/api/test-subscription-success", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Update user to have active subscription
      await storage.updateUserSubscription(userId, {
        subscriptionStatus: 'active',
        subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        stripeSubscriptionId: 'sub_test_' + Math.random().toString(36).substr(2, 9)
      });
      
      res.json({ success: true, message: 'Subscription activated for testing' });
    } catch (error) {
      console.error("Error activating test subscription:", error);
      res.status(500).json({ message: "Failed to activate test subscription" });
    }
  });
  
  // Webhook to handle Stripe events
  app.post("/api/stripe-webhook", express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err}`);
    }
    
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as any;
        if (session.metadata?.userId) {
          console.log('Subscription completed for user:', session.metadata.userId);
          await storage.updateUserSubscription(session.metadata.userId, {
            stripeSubscriptionId: session.subscription,
            subscriptionStatus: 'active',
            subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
          });
        }
        break;
        
      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object as any;
        const customer = await stripe.customers.retrieve(updatedSubscription.customer);
        if (customer && !customer.deleted && customer.metadata?.userId) {
          const status = updatedSubscription.status === 'active' ? 'active' : 'inactive';
          await storage.updateUserSubscription(customer.metadata.userId, {
            subscriptionStatus: status,
            subscriptionExpiresAt: status === 'active' ? 
              new Date(updatedSubscription.current_period_end * 1000) : null
          });
        }
        break;
        
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as any;
        const deletedCustomer = await stripe.customers.retrieve(deletedSubscription.customer);
        if (deletedCustomer && !deletedCustomer.deleted && deletedCustomer.metadata?.userId) {
          await storage.updateUserSubscription(deletedCustomer.metadata.userId, {
            subscriptionStatus: 'canceled',
            subscriptionExpiresAt: null
          });
        }
        break;
    }
    
    res.json({ received: true });
  });

  // Scanning Queue API routes
  
  // Get scanning queue for current user
  app.get("/api/scanning-queue", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const queue = await storage.getScanningQueue(userId);
      res.json(queue);
    } catch (error) {
      console.error("Error fetching scanning queue:", error);
      res.status(500).json({ message: "Failed to fetch scanning queue" });
    }
  });
  
  // Add item to scanning queue
  app.post("/api/scanning-queue", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isbn } = req.body;
      
      if (!isbn) {
        return res.status(400).json({ message: "ISBN is required" });
      }
      
      const queueItem = await storage.addToScanningQueue({
        userId,
        isbn: isbn.trim(),
        status: "scanning"
      });
      
      res.status(201).json(queueItem);
      
      // Start processing the item in the background
      setImmediate(() => processScanningQueueItem(queueItem.id));
      
    } catch (error) {
      console.error("Error adding to scanning queue:", error);
      res.status(500).json({ message: "Failed to add to scanning queue" });
    }
  });
  
  // Update scanning queue item
  app.patch("/api/scanning-queue/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updatedItem = await storage.updateScanningQueueItem(id, req.body);
      
      if (!updatedItem) {
        return res.status(404).json({ message: "Queue item not found" });
      }
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating scanning queue item:", error);
      res.status(500).json({ message: "Failed to update scanning queue item" });
    }
  });
  
  // Retry scanning queue item
  app.post("/api/scanning-queue/:id/retry", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updatedItem = await storage.updateScanningQueueItem(id, {
        status: "scanning",
        error: null,
        retryCount: req.body.retryCount || 0
      });
      
      if (!updatedItem) {
        return res.status(404).json({ message: "Queue item not found" });
      }
      
      res.json(updatedItem);
      
      // Start processing the item in the background
      setImmediate(() => processScanningQueueItem(id));
      
    } catch (error) {
      console.error("Error retrying scanning queue item:", error);
      res.status(500).json({ message: "Failed to retry scanning queue item" });
    }
  });
  
  // Remove single queue item
  app.delete("/api/scanning-queue/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.removeScanningQueueItem(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Queue item not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing scanning queue item:", error);
      res.status(500).json({ message: "Failed to remove scanning queue item" });
    }
  });

  // Clear completed items from queue
  app.delete("/api/scanning-queue/completed", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.clearCompletedScanningQueue(userId);
      res.json({ message: "Completed items cleared" });
    } catch (error) {
      console.error("Error clearing completed queue items:", error);
      res.status(500).json({ message: "Failed to clear completed items" });
    }
  });

  // Background processing function for scanning queue items
  async function processScanningQueueItem(queueItemId: string) {
    try {
      // Get the queue item by finding it across all user queues
      let queueItem: any = null;
      const allUsers = await storage.getAllUsers();
      
      for (const user of allUsers) {
        const userQueue = await storage.getScanningQueue(user.id);
        const foundItem = userQueue.find(item => item.id === queueItemId);
        if (foundItem) {
          queueItem = foundItem;
          break;
        }
      }
      
      if (!queueItem || queueItem.status === 'success' || queueItem.status === 'error') {
        return; // Item already processed or doesn't exist
      }
      
      // Update status to looking-up
      await storage.updateScanningQueueItem(queueItemId, { status: 'looking-up' });
      
      // Call the lookup function directly to avoid auth issues
      const bookData = await lookupBookByISBN(queueItem.isbn, queueItem.userId);
      
      if (!bookData.title) {
        throw new Error('Book not found in our database');
      }

      // Update queue item with book info
      await storage.updateScanningQueueItem(queueItemId, { 
        status: 'adding',
        title: bookData.title,
        author: bookData.author,
        coverUrl: bookData.coverImage
      });

      // Add book to library
      const book = await storage.createBook({
        isbn: queueItem.isbn,
        title: bookData.title,
        author: bookData.author,
        coverImage: bookData.coverImage,
        coverImages: bookData.coverImages || [],
        selectedCoverIndex: bookData.selectedCoverIndex || 0,
        description: bookData.description || '',
        publishYear: bookData.publishYear,
        publishDate: bookData.publishDate,
        publisher: bookData.publisher,
        language: bookData.language,
        pages: bookData.pages,
        dimensions: bookData.dimensions,
        weight: bookData.weight,
        rating: bookData.rating,
        ratingsTotal: bookData.ratingsTotal,
        categories: bookData.categories || [],
        featureBullets: bookData.featureBullets || [],
        amazonDomain: bookData.amazonDomain,
        userId: queueItem.userId,
        status: bookData.status,
        
        // Include comprehensive metadata
        aboutThisItem: bookData.aboutThisItem,
        bookDescription: bookData.bookDescription,
        editorialReviews: bookData.editorialReviews,
        ratingBreakdown: bookData.ratingBreakdown,
        topReviews: bookData.topReviews,
        bestsellersRank: bookData.bestsellersRank,
        alsoBought: bookData.alsoBought,
        variants: bookData.variants,
        amazonData: bookData.amazonData
      });

      // Mark as success
      await storage.updateScanningQueueItem(queueItemId, { 
        status: 'success',
        completedAt: new Date()
      });

    } catch (error) {
      console.error(`Error processing queue item ${queueItemId}:`, error);
      await storage.updateScanningQueueItem(queueItemId, { 
        status: 'error', 
        error: (error as Error).message || 'Unknown error',
        completedAt: new Date()
      });
    }
  }

  const httpServer = createServer(app);
  return httpServer;
}
