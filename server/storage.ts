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
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, and, desc, inArray, ne, sql } from "drizzle-orm";

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
  
  // Subscription operations
  updateUserSubscription(userId: string, data: { 
    stripeCustomerId?: string; 
    stripeSubscriptionId?: string; 
    subscriptionStatus?: string;
    subscriptionExpiresAt?: Date;
  }): Promise<User | undefined>;
  incrementUserBookCount(userId: string): Promise<User | undefined>;
  updateUserBookCount(userId: string, count: number): Promise<User | undefined>;
  getUserBookCount(userId: string): Promise<number>;
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id: string): Promise<User | undefined> {
    console.log('Getting user details for:', id);
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users);
    return allUsers;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Handle case where email might be null/undefined
    if (userData.email) {
      // First try to find existing user by email
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existingUser.length > 0) {
        // Update existing user
        const [user] = await db
          .update(users)
          .set({
            ...userData,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email))
          .returning();
        return user;
      }
    }
    
    // Insert new user (or fallback if no email)
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email, // Handle email conflicts
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
  
  // Subscription operations
  async updateUserSubscription(userId: string, data: { 
    stripeCustomerId?: string; 
    stripeSubscriptionId?: string; 
    subscriptionStatus?: string;
    subscriptionExpiresAt?: Date;
  }): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }
  
  async incrementUserBookCount(userId: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        bookCount: sql`${users.bookCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }
  
  async updateUserBookCount(userId: string, count: number): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        bookCount: count,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }
  
  async getUserBookCount(userId: string): Promise<number> {
    const [user] = await db
      .select({ bookCount: users.bookCount })
      .from(users)
      .where(eq(users.id, userId));
    return user?.bookCount || 0;
  }
}

export const storage = new DatabaseStorage();
