import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { foods, categories } from "@db/schema";
import { eq, and, like, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";


export const foodRouter = createRouter({
  // List all categories
  categories: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(categories).orderBy(categories.sortOrder);
  }),

  // List foods with optional filters
  list: publicQuery
    .input(
      z.object({
        categoryId: z.number().optional(),
        search: z.string().optional(),
        isVegetarian: z.boolean().optional(),
        isPopular: z.boolean().optional(),
        mealType: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];

      if (input?.categoryId) {
        conditions.push(eq(foods.categoryId, input.categoryId));
      }
      if (input?.search) {
        conditions.push(like(foods.name, `%${input.search}%`));
      }
      if (input?.isVegetarian !== undefined) {
        conditions.push(eq(foods.isVegetarian, input.isVegetarian));
      }
      if (input?.isPopular !== undefined) {
        conditions.push(eq(foods.isPopular, input.isPopular));
      }
      if (input?.mealType) {
        conditions.push(eq(foods.mealType, input.mealType as "breakfast" | "lunch" | "dinner" | "snack" | "any"));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      return db
        .select()
        .from(foods)
        .where(where)
        .limit(input?.limit ?? 50);
    }),

  // Get food by ID
  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(foods)
        .where(eq(foods.id, input.id));
      return result[0] ?? null;
    }),

  // Get foods by category
  byCategory: publicQuery
    .input(z.object({ categoryId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(foods)
        .where(eq(foods.categoryId, input.categoryId));
    }),

  // Get popular foods
  popular: publicQuery.query(async () => {
    const db = getDb();
    return db
      .select()
      .from(foods)
      .where(eq(foods.isPopular, true));
  }),

  // Search foods
  search: publicQuery
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(foods)
        .where(like(foods.name, `%${input.query}%`));
    }),

  // Get food count (admin)
  count: publicQuery.query(async () => {
    const db = getDb();
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(foods);
    return result[0]?.count ?? 0;
  }),

  // Get staging manifest (admin/staging UI)
  stagingManifest: publicQuery.query(async () => {
    const manifestPath = path.resolve(process.cwd(), "public/assets/manifest.json");
    if (fs.existsSync(manifestPath)) {
      try {
        const content = fs.readFileSync(manifestPath, "utf-8");
        return JSON.parse(content);
      } catch (e) {
        console.error("Failed to read manifest.json:", e);
      }
    }
    return {};
  }),

  // Update verification status (approve / pending)
  setVerification: publicQuery
    .input(z.object({ foodId: z.number(), verified: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const manifestPath = path.resolve(process.cwd(), "public/assets/manifest.json");
      if (fs.existsSync(manifestPath)) {
        try {
          const content = fs.readFileSync(manifestPath, "utf-8");
          const manifest = JSON.parse(content) as Record<string, any>;
          let found = false;
          let relativeWebpPath = "";
          
          for (const key of Object.keys(manifest)) {
            if (manifest[key].id === input.foodId) {
              manifest[key].verification_flag = input.verified;
              relativeWebpPath = manifest[key].image_path;
              found = true;
              break;
            }
          }
          if (found) {
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
            
            // If verified is true, sync the database image path
            if (input.verified && relativeWebpPath) {
              await db
                .update(foods)
                .set({ image: relativeWebpPath })
                .where(eq(foods.id, input.foodId));
            }
            return { success: true };
          }
        } catch (e) {
          console.error("Failed to update manifest.json:", e);
          throw new Error("Failed to write verification status to manifest");
        }
      }
      return { success: false, error: "Manifest file not found" };
    }),
});
