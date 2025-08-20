import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const books = pgTable("books", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  isbn: varchar("isbn", { length: 13 }).notNull(),
  asin: varchar("asin", { length: 20 }),
  title: text("title").notNull(),
  author: text("author").notNull(),
  description: text("description"),
  coverImage: text("cover_image"),
  coverImages: text("cover_images").array(),
  selectedCoverIndex: integer("selected_cover_index").default(0),
  publishYear: integer("publish_year"),
  publishDate: text("publish_date"),
  publisher: text("publisher"),
  language: text("language"),
  pages: integer("pages"),
  dimensions: text("dimensions"),
  width: decimal("width", { precision: 5, scale: 2 }),
  height: decimal("height", { precision: 5, scale: 2 }),
  depth: decimal("depth", { precision: 5, scale: 2 }),
  weight: text("weight"),
  rating: text("rating"),
  ratingsTotal: integer("ratings_total"),
  reviewsTotal: integer("reviews_total"),
  price: text("price"),
  originalPrice: text("original_price"),
  categories: text("categories").array(),
  featureBullets: text("feature_bullets").array(),
  availability: text("availability"),
  amazonDomain: varchar("amazon_domain", { length: 50 }).notNull().default("amazon.com.au"),
  userId: varchar("user_id"), // nullable initially to preserve existing data
  status: varchar("status", { length: 20 }).notNull().default("want-to-read"),
  addedAt: timestamp("added_at").defaultNow().notNull(),
}, (table) => ({
  // Create a composite unique constraint for ISBN per user (but allow null userId)
  userIsbnUnique: index("user_isbn_idx").on(table.userId, table.isbn),
}));

export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
  addedAt: true,
});

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User preferences table
export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  amazonDomain: varchar("amazon_domain", { length: 50 }).notNull().default("amazon.com.au"),
  currency: varchar("currency", { length: 3 }).default("AUD"),
  measurementUnit: varchar("measurement_unit", { length: 10 }).default("metric"), // metric or imperial
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ many, one }) => ({
  books: many(books),
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  }),
}));

export const booksRelations = relations(books, ({ one }) => ({
  user: one(users, {
    fields: [books.userId],
    references: [users.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof books.$inferSelect;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;
