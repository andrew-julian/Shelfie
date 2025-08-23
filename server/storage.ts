import { 
  type Book, 
  type InsertBook, 
  type User, 
  type UpsertUser, 
  type UserPreferences, 
  type InsertUserPreferences,
  type ScanningQueueItem,
  type InsertScanningQueueItem,
  books, 
  users, 
  userPreferences,
  scanningQueue
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray, ne } from "drizzle-orm";

export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User preferences operations
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences | undefined>;
  
  // Book operations (now user-specific)
  getBook(id: string, userId?: string): Promise<Book | undefined>;
  getBookByIsbn(isbn: string, userId?: string): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  getAllBooks(userId?: string): Promise<Book[]>;
  updateBookStatus(id: string, status: string, userId?: string): Promise<Book | undefined>;
  updateBookData(id: string, data: Partial<Omit<Book, 'id' | 'isbn' | 'addedAt'>>, userId?: string): Promise<Book | undefined>;
  deleteBook(id: string, userId?: string): Promise<boolean>;
  
  // Scanning queue operations
  addToScanningQueue(item: InsertScanningQueueItem): Promise<ScanningQueueItem>;
  getScanningQueue(userId: string): Promise<ScanningQueueItem[]>;
  getPendingScanningQueue(userId: string): Promise<ScanningQueueItem[]>;
  updateScanningQueueItem(id: string, data: Partial<ScanningQueueItem>): Promise<ScanningQueueItem | undefined>;
  removeScanningQueueItem(id: string): Promise<boolean>;
  clearCompletedScanningQueue(userId: string): Promise<void>;
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users);
    return allUsers;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // User preferences operations
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [preferences] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return preferences;
  }

  async createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const [newPreferences] = await db
      .insert(userPreferences)
      .values(preferences)
      .returning();
    return newPreferences;
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences | undefined> {
    const [updatedPreferences] = await db
      .update(userPreferences)
      .set({ ...preferences, updatedAt: new Date() })
      .where(eq(userPreferences.userId, userId))
      .returning();
    return updatedPreferences;
  }
  async getBook(id: string, userId?: string): Promise<Book | undefined> {
    const conditions = userId ? and(eq(books.id, id), eq(books.userId, userId)) : eq(books.id, id);
    const [book] = await db.select().from(books).where(conditions);
    return book || undefined;
  }

  async getBookByIsbn(isbn: string, userId?: string): Promise<Book | undefined> {
    const conditions = userId ? and(eq(books.isbn, isbn), eq(books.userId, userId)) : eq(books.isbn, isbn);
    const [book] = await db.select().from(books).where(conditions);
    return book || undefined;
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    const [book] = await db
      .insert(books)
      .values(insertBook)
      .returning();
    return book;
  }

  async getAllBooks(userId?: string): Promise<Book[]> {
    const conditions = userId ? eq(books.userId, userId) : undefined;
    const allBooks = conditions ? 
      await db.select().from(books).where(conditions) :
      await db.select().from(books);
    return allBooks.sort((a, b) => 
      new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    );
  }

  async updateBookStatus(id: string, status: string, userId?: string): Promise<Book | undefined> {
    const conditions = userId ? and(eq(books.id, id), eq(books.userId, userId)) : eq(books.id, id);
    const [updatedBook] = await db
      .update(books)
      .set({ status })
      .where(conditions)
      .returning();
    return updatedBook || undefined;
  }

  async updateBookData(id: string, data: Partial<Omit<Book, 'id' | 'isbn' | 'addedAt'>>, userId?: string): Promise<Book | undefined> {
    const conditions = userId ? and(eq(books.id, id), eq(books.userId, userId)) : eq(books.id, id);
    const [updatedBook] = await db
      .update(books)
      .set(data)
      .where(conditions)
      .returning();
    return updatedBook || undefined;
  }

  async deleteBook(id: string, userId?: string): Promise<boolean> {
    const conditions = userId ? and(eq(books.id, id), eq(books.userId, userId)) : eq(books.id, id);
    const result = await db.delete(books).where(conditions);
    return (result.rowCount ?? 0) > 0;
  }
  
  // Scanning queue operations
  async addToScanningQueue(item: InsertScanningQueueItem): Promise<ScanningQueueItem> {
    const [queueItem] = await db
      .insert(scanningQueue)
      .values(item)
      .returning();
    return queueItem;
  }
  
  async getScanningQueue(userId: string): Promise<ScanningQueueItem[]> {
    const items = await db
      .select()
      .from(scanningQueue)
      .where(eq(scanningQueue.userId, userId))
      .orderBy(desc(scanningQueue.createdAt));
    return items;
  }
  
  async getPendingScanningQueue(userId: string): Promise<ScanningQueueItem[]> {
    const items = await db
      .select()
      .from(scanningQueue)
      .where(and(
        eq(scanningQueue.userId, userId),
        inArray(scanningQueue.status, ['scanning', 'looking-up', 'adding'])
      ))
      .orderBy(desc(scanningQueue.createdAt));
    return items;
  }
  
  async updateScanningQueueItem(id: string, data: Partial<ScanningQueueItem>): Promise<ScanningQueueItem | undefined> {
    const [updatedItem] = await db
      .update(scanningQueue)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(scanningQueue.id, id))
      .returning();
    return updatedItem;
  }
  
  async removeScanningQueueItem(id: string): Promise<boolean> {
    try {
      await db.delete(scanningQueue).where(eq(scanningQueue.id, id));
      return true;
    } catch (error) {
      console.error("Error removing scanning queue item:", error);
      return false;
    }
  }
  
  async clearCompletedScanningQueue(userId: string): Promise<void> {
    await db
      .delete(scanningQueue)
      .where(and(
        eq(scanningQueue.userId, userId),
        inArray(scanningQueue.status, ['success', 'error'])
      ));
  }
}

export const storage = new DatabaseStorage();
