import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { badges, userBadges } from "@db/schema";
import { eq, and, sql } from "drizzle-orm";

export const badgeRouter = createRouter({
  // Get all badges
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(badges);
  }),

  // Get user's earned badges
  myBadges: publicQuery
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const earned = await db
        .select({
          id: userBadges.id,
          badgeId: userBadges.badgeId,
          earnedAt: userBadges.earnedAt,
          name: badges.name,
          description: badges.description,
          icon: badges.icon,
          color: badges.color,
          points: badges.points,
        })
        .from(userBadges)
        .innerJoin(badges, eq(userBadges.badgeId, badges.id))
        .where(eq(userBadges.userId, input.userId));

      const allBadges = await db.select().from(badges);
      const earnedIds = new Set(earned.map((e) => e.badgeId));

      return {
        earned,
        available: allBadges.filter((b) => !earnedIds.has(b.id)),
        totalPoints: earned.reduce((sum, e) => sum + e.points, 0),
      };
    }),

  // Award a badge to user
  award: publicQuery
    .input(z.object({ userId: z.number(), badgeId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Check if already earned
      const existing = await db
        .select()
        .from(userBadges)
        .where(
          and(
            eq(userBadges.userId, input.userId),
            eq(userBadges.badgeId, input.badgeId)
          )
        );

      if (existing.length > 0) {
        return { success: false, message: "Badge already earned" };
      }

      await db.insert(userBadges).values({
        userId: input.userId,
        badgeId: input.badgeId,
      });

      return { success: true };
    }),

  // Get leaderboard (users by points)
  leaderboard: publicQuery.query(async () => {
    const db = getDb();
    return db
      .select({
        userId: userBadges.userId,
        points: sql<number>`sum(${badges.points})`.as("points"),
        badgeCount: sql<number>`count(*)`.as("badgeCount"),
      })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .groupBy(userBadges.userId)
      .orderBy(sql`points desc`)
      .limit(10);
  }),
});
