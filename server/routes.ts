import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

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
    // Parse various dimension formats like "8.5 x 5.5 x 1.2 inches", "21.6 x 14 x 2.8 cm", etc.
    const matches = dimensionText.match(/([\d.]+)\s*x\s*([\d.]+)\s*x\s*([\d.]+)/i);
    if (!matches) {
      return { width: null, height: null, depth: null };
    }
    
    let [, dim1Str, dim2Str, dim3Str] = matches;
    let dim1 = parseFloat(dim1Str);
    let dim2 = parseFloat(dim2Str);
    let dim3 = parseFloat(dim3Str);
    
    // Convert to inches if needed (assuming cm if any dimension > 15)
    if (dim1 > 15 || dim2 > 15 || dim3 > 15) {
      dim1 = dim1 / 2.54; // cm to inches
      dim2 = dim2 / 2.54;
      dim3 = dim3 / 2.54;
    }
    
    // Amazon dimensions are typically in Width x Depth x Height format for books
    // Based on user feedback, assign dimensions in original order:
    // dim1 = width, dim2 = depth, dim3 = height
    let width = dim1;
    let depth = dim2; 
    let height = dim3;
    
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all books
  app.get("/api/books", async (req, res) => {
    try {
      const books = await storage.getAllBooks();
      res.json(books);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch books" });
    }
  });

  // Lookup book by ISBN using Rainforest API
  app.get("/api/books/lookup/:isbn", async (req, res) => {
    try {
      const { isbn } = req.params;
      
      // Check if book already exists
      const existingBook = await storage.getBookByIsbn(isbn);
      if (existingBook) {
        return res.status(409).json({ 
          message: "Book already exists in your library",
          book: existingBook 
        });
      }

      // Call Rainforest API
      const apiKey = process.env.RAINFOREST_API_KEY || "92575A16923F492BA4F7A0CA68E40AA7";
      const rainforestUrl = `https://api.rainforestapi.com/request?api_key=${apiKey}&type=product&gtin=${isbn}&amazon_domain=amazon.com`;
      
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
        coverImage: product.main_image?.link || product.images?.[0]?.link || "",
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
        status: "want-to-read"
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
  app.post("/api/books", async (req, res) => {
    try {
      const validatedData = insertBookSchema.parse(req.body);
      
      // Check if book already exists
      const existingBook = await storage.getBookByIsbn(validatedData.isbn);
      if (existingBook) {
        return res.status(409).json({ 
          message: "Book already exists in your library",
          book: existingBook 
        });
      }

      const book = await storage.createBook(validatedData);
      res.status(201).json(book);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid book data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to add book" });
      }
    }
  });

  // Update book data
  app.patch("/api/books/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData.isbn;
      delete updateData.addedAt;

      const updatedBook = await storage.updateBookData(id, updateData);
      
      if (!updatedBook) {
        return res.status(404).json({ message: "Book not found" });
      }

      res.json(updatedBook);
    } catch (error) {
      res.status(500).json({ message: "Failed to update book" });
    }
  });

  // Update book status
  app.patch("/api/books/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!["want-to-read", "reading", "read"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updatedBook = await storage.updateBookStatus(id, status);
      
      if (!updatedBook) {
        return res.status(404).json({ message: "Book not found" });
      }

      res.json(updatedBook);
    } catch (error) {
      res.status(500).json({ message: "Failed to update book status" });
    }
  });

  // Refresh book data from API
  app.patch("/api/books/:id/refresh", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get existing book
      const existingBook = await storage.getBook(id);
      if (!existingBook) {
        return res.status(404).json({ message: "Book not found" });
      }

      // Call Rainforest API with fresh lookup
      const apiKey = process.env.RAINFOREST_API_KEY || "92575A16923F492BA4F7A0CA68E40AA7";
      const rainforestUrl = `https://api.rainforestapi.com/request?api_key=${apiKey}&type=product&gtin=${existingBook.isbn}&amazon_domain=amazon.com`;
      
      const response = await fetch(rainforestUrl);
      
      if (!response.ok) {
        return res.status(400).json({ message: "Failed to refresh book data" });
      }

      const data = await response.json();
      
      if (!data.product) {
        return res.status(400).json({ message: "No updated data available" });
      }

      const product = data.product;
      
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
                const variantUrl = `https://api.rainforestapi.com/request?api_key=${apiKey}&type=product&asin=${variant.asin}&amazon_domain=amazon.com`;
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
        coverImage: product.main_image?.link || product.images?.[0]?.link || existingBook.coverImage,
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
      });
      
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

  // Refresh all books
  app.post("/api/books/refresh-all", async (req, res) => {
    try {
      const allBooks = await storage.getAllBooks();
      const refreshedBooks = [];
      const apiKey = process.env.RAINFOREST_API_KEY || "92575A16923F492BA4F7A0CA68E40AA7";
      
      console.log(`Starting refresh of ${allBooks.length} books...`);
      
      for (const book of allBooks) {
        try {
          // Call Rainforest API for fresh data
          const rainforestUrl = `https://api.rainforestapi.com/request?api_key=${apiKey}&type=product&gtin=${book.isbn}&amazon_domain=amazon.com`;
          const response = await fetch(rainforestUrl);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.product) {
              const product = data.product;
              
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
                        const variantUrl = `https://api.rainforestapi.com/request?api_key=${apiKey}&type=product&asin=${variant.asin}&amazon_domain=amazon.com`;
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
              const parsedDimensions = parseAndAssignDimensions(finalDimensions, book.title);
              
              const updateData = {
                title: product.title || book.title,
                author: author,
                description: product.description || featureBullets.join(". ") || book.description,
                coverImage: product.main_image?.link || product.images?.[0]?.link || book.coverImage,
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
              };
              
              const updatedBook = await storage.updateBookData(book.id, updateData);
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
          // Keep original book if refresh fails
          refreshedBooks.push(book);
        }
      }
      
      console.log(`Completed refresh of ${refreshedBooks.length} books`);
      
      res.json({ 
        message: `Refreshed ${refreshedBooks.length} books`,
        books: refreshedBooks
      });
    } catch (error) {
      console.error('Failed to refresh all books:', error);
      res.status(500).json({ message: "Failed to refresh books" });
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

  const httpServer = createServer(app);
  return httpServer;
}
