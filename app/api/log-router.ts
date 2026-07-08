import { z } from "zod";
import { createRouter, publicQuery } from "./middleware.js";
import { getDb } from "./queries/connection.js";
import { dailyLogs, logItems, foods, userSettings } from "@db/schema.js";
import { eq, desc } from "drizzle-orm";

export const logRouter = createRouter({
  // Get or create today's log for user
  today: publicQuery
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const todayStr = new Date().toISOString().split("T")[0];
      const todayDate = new Date(todayStr);

      // Get all logs for this user
      const allLogs = await db
        .select()
        .from(dailyLogs)
        .where(eq(dailyLogs.userId, input.userId))
        .orderBy(desc(dailyLogs.date));

      // Find today's log
      let log = allLogs.find((l) => {
        const logDate = new Date(l.date);
        return logDate.toISOString().split("T")[0] === todayStr;
      });

      // Create if not exists
      if (!log) {
        const settings = await db
          .select()
          .from(userSettings)
          .where(eq(userSettings.userId, input.userId))
          .then((rows) => rows[0]);

        const insertResult = await db.insert(dailyLogs).values({
          userId: input.userId,
          date: todayStr,
          calorieGoal: settings?.calorieGoal ?? 2000,
          proteinGoal: settings?.proteinGoal ?? 60,
          carbsGoal: settings?.carbsGoal ?? 250,
          fatsGoal: settings?.fatsGoal ?? 70,
        });

        const newLogId = Number((insertResult as unknown as { insertId: number }).insertId ?? 0);
        const fetchedLog = await db
          .select()
          .from(dailyLogs)
          .where(eq(dailyLogs.id, newLogId))
          .then((rows) => rows[0]);
        if (!fetchedLog) throw new Error("Failed to create log");
        log = fetchedLog;
      }

      // Get log items with food details
      const items = await db
        .select({
          id: logItems.id,
          foodId: logItems.foodId,
          quantity: logItems.quantity,
          calories: logItems.calories,
          protein: logItems.protein,
          carbs: logItems.carbs,
          fats: logItems.fats,
          mealType: logItems.mealType,
          loggedAt: logItems.loggedAt,
          foodName: foods.name,
          foodImage: foods.image,
          servingSize: foods.servingSize,
        })
        .from(logItems)
        .innerJoin(foods, eq(logItems.foodId, foods.id))
        .where(eq(logItems.logId, log.id));

      // Calculate totals
      const totals = items.reduce(
        (acc, item) => ({
          calories: acc.calories + item.calories,
          protein: acc.protein + Number(item.protein),
          carbs: acc.carbs + Number(item.carbs),
          fats: acc.fats + Number(item.fats),
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      );

      return { log, items, totals };
    }),

  // Get logs for a date range
  range: publicQuery
    .input(
      z.object({
        userId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);

      const logs = await db
        .select()
        .from(dailyLogs)
        .where(eq(dailyLogs.userId, input.userId))
        .orderBy(dailyLogs.date);

      return logs.filter((l) => {
        const d = new Date(l.date);
        return d >= startDate && d <= endDate;
      });
    }),

  // Add food to log
  addItem: publicQuery
    .input(
      z.object({
        logId: z.number(),
        foodId: z.number(),
        quantity: z.number().min(0.1).max(10).default(1),
        mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      const food = await db
        .select()
        .from(foods)
        .where(eq(foods.id, input.foodId))
        .then((rows) => rows[0]);

      if (!food) throw new Error("Food not found");

      const q = input.quantity;
      const calories = Math.round(food.calories * q);
      const protein = Number(food.protein) * q;
      const carbs = Number(food.carbs) * q;
      const fats = Number(food.fats) * q;

      await db.insert(logItems).values({
        logId: input.logId,
        foodId: input.foodId,
        quantity: q,
        calories,
        protein: Number(protein.toFixed(1)),
        carbs: Number(carbs.toFixed(1)),
        fats: Number(fats.toFixed(1)),
        mealType: input.mealType,
      });

      return { success: true, calories, protein, carbs, fats };
    }),

  // Remove item from log
  removeItem: publicQuery
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(logItems).where(eq(logItems.id, input.itemId));
      return { success: true };
    }),

  // Update daily goals
  updateGoals: publicQuery
    .input(
      z.object({
        logId: z.number(),
        calorieGoal: z.number().optional(),
        proteinGoal: z.number().optional(),
        carbsGoal: z.number().optional(),
        fatsGoal: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { logId, ...goals } = input;
      await db
        .update(dailyLogs)
        .set(goals)
        .where(eq(dailyLogs.id, logId));
      return { success: true };
    }),

  // Get recent logs (for streak calculation)
  recent: publicQuery
    .input(
      z.object({
        userId: z.number(),
        limit: z.number().default(30),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(dailyLogs)
        .where(eq(dailyLogs.userId, input.userId))
        .orderBy(desc(dailyLogs.date))
        .limit(input.limit);
    }),
});
