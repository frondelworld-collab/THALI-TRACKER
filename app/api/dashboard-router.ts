import { createRouter, publicQuery } from "./middleware.js";
import { getDb } from "./queries/connection.js";
import { users, foods, dailyLogs, scanHistory, logItems } from "@db/schema.js";
import { sql, desc } from "drizzle-orm";

export const dashboardRouter = createRouter({
  // Admin dashboard stats
  stats: publicQuery.query(async () => {
    const db = getDb();

    const [userCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const [foodCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(foods);

    const [logCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(dailyLogs);

    const [scanCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(scanHistory);

    // Total calories logged
    const [calorieStats] = await db
      .select({
        total: sql<number>`coalesce(sum(${dailyLogs.pointsEarned}), 0)`,
      })
      .from(dailyLogs);

    return {
      users: userCount?.count ?? 0,
      foods: foodCount?.count ?? 0,
      logs: logCount?.count ?? 0,
      scans: scanCount?.count ?? 0,
      totalPoints: calorieStats?.total ?? 0,
    };
  }),

  // Recent activity
  recentActivity: publicQuery.query(async () => {
    const db = getDb();
    const logs = await db
      .select({
        id: dailyLogs.id,
        date: dailyLogs.date,
        userId: dailyLogs.userId,
        pointsEarned: dailyLogs.pointsEarned,
        streakCount: dailyLogs.streakCount,
      })
      .from(dailyLogs)
      .orderBy(desc(dailyLogs.createdAt))
      .limit(20);

    return logs;
  }),

  // Food distribution by category
  foodDistribution: publicQuery.query(async () => {
    const db = getDb();
    return db
      .select({
        categoryId: foods.categoryId,
        count: sql<number>`count(*)`,
      })
      .from(foods)
      .groupBy(foods.categoryId);
  }),

  // Daily log items count (admin)
  logItemsCount: publicQuery.query(async () => {
    const db = getDb();
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(logItems);
    return result?.count ?? 0;
  }),
});
