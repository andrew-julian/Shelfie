import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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
      
      const bookData = {
        isbn,
        asin: product.asin || null,
        title: product.title || "Unknown Title",
        author: product.brand || product.by_line || "Unknown Author",
        description: product.description || product.feature_bullets?.join(" ") || "",
        coverImage: product.main_image?.link || "",
        publishYear: product.publication_date ? new Date(product.publication_date).getFullYear() : null,
        publishDate: product.publication_date || null,
        publisher: product.publisher || null,
        language: product.language || null,
        pages: product.pages || null,
        dimensions: product.dimensions || null,
        weight: product.weight || null,
        rating: product.rating?.toString() || null,
        ratingsTotal: product.ratings_total || null,
        reviewsTotal: product.reviews_total || null,
        price: product.price?.raw || product.price || null,
        originalPrice: product.original_price?.raw || product.original_price || null,
        categories: product.categories || [],
        featureBullets: product.feature_bullets || [],
        availability: product.availability?.raw || product.availability || null,
        status: "want-to-read"
      };

      res.json(bookData);
    } catch (error) {
      console.error("ISBN lookup error:", error);
      res.status(500).json({ message: "Failed to lookup book" });
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
