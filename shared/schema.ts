import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const books = pgTable("books", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  isbn: varchar("isbn", { length: 13 }).notNull().unique(),
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
  status: varchar("status", { length: 20 }).notNull().default("want-to-read"),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
  addedAt: true,
});

export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof books.$inferSelect;
