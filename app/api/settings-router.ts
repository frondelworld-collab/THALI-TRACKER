import { z } from "zod";
import { createRouter, publicQuery } from "./middleware.js";
import { getDb } from "./queries/connection.js";
import { userSettings } from "@db/schema.js";
import { eq } from "drizzle-orm";

export const settingsRouter = createRouter({
  // Get user settings
  get: publicQuery
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, input.userId));
      return result[0] ?? null;
    }),

  // Create or update user settings
  upsert: publicQuery
    .input(
      z.object({
        userId: z.number(),
        calorieGoal: z.number().min(500).max(5000).optional(),
        proteinGoal: z.number().min(10).max(300).optional(),
        carbsGoal: z.number().min(20).max(500).optional(),
        fatsGoal: z.number().min(10).max(200).optional(),
        dietaryPreference: z
          .enum(["none", "vegetarian", "vegan", "gluten_free"])
          .optional(),
        healthCondition: z
          .enum(["none", "diabetes", "heart_health", "weight_loss", "muscle_gain"])
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { userId, ...settings } = input;

      const existing = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId));

      if (existing.length > 0) {
        await db
          .update(userSettings)
          .set(settings)
          .where(eq(userSettings.userId, userId));
      } else {
        await db.insert(userSettings).values({
          userId,
          calorieGoal: settings.calorieGoal ?? 2000,
          proteinGoal: settings.proteinGoal ?? 60,
          carbsGoal: settings.carbsGoal ?? 250,
          fatsGoal: settings.fatsGoal ?? 70,
          dietaryPreference: settings.dietaryPreference ?? "none",
          healthCondition: settings.healthCondition ?? "none",
        });
      }

      return { success: true };
    }),
});
