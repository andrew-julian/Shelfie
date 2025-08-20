import { type Book, type InsertBook } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getBook(id: string): Promise<Book | undefined>;
  getBookByIsbn(isbn: string): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  getAllBooks(): Promise<Book[]>;
  updateBookStatus(id: string, status: string): Promise<Book | undefined>;
  deleteBook(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private books: Map<string, Book>;

  constructor() {
    this.books = new Map();
  }

  async getBook(id: string): Promise<Book | undefined> {
    return this.books.get(id);
  }

  async getBookByIsbn(isbn: string): Promise<Book | undefined> {
    return Array.from(this.books.values()).find(
      (book) => book.isbn === isbn,
    );
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    const id = randomUUID();
    const book: Book = { 
      ...insertBook, 
      id, 
      addedAt: new Date()
    };
    this.books.set(id, book);
    return book;
  }

  async getAllBooks(): Promise<Book[]> {
    return Array.from(this.books.values()).sort((a, b) => 
      new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    );
  }

  async updateBookStatus(id: string, status: string): Promise<Book | undefined> {
    const book = this.books.get(id);
    if (!book) return undefined;
    
    const updatedBook = { ...book, status };
    this.books.set(id, updatedBook);
    return updatedBook;
  }

  async deleteBook(id: string): Promise<boolean> {
    return this.books.delete(id);
  }
}

export const storage = new MemStorage();
