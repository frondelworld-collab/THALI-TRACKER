import {
  sqliteTable,
  integer,
  text,
  real,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── Users (auth) ───
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  unionId: text("unionId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  avatar: text("avatar"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: integer("lastSignInAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Food Categories ───
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export type Category = typeof categories.$inferSelect;

// ─── Foods (Indian food database) ───
export const foods = sqliteTable("foods", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  hindiName: text("hindi_name"),
  description: text("description"),
  image: text("image"),
  categoryId: integer("category_id").notNull(),
  servingSize: text("serving_size").default("100g").notNull(),
  calories: integer("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fats: real("fats").notNull(),
  fiber: real("fiber").default(0),
  sugar: real("sugar").default(0),
  isVegetarian: integer("is_vegetarian", { mode: "boolean" }).default(true).notNull(),
  isVegan: integer("is_vegan", { mode: "boolean" }).default(false).notNull(),
  isGlutenFree: integer("is_gluten_free", { mode: "boolean" }).default(false).notNull(),
  mealType: text("meal_type", { enum: ["breakfast", "lunch", "dinner", "snack", "any"] }).default("any").notNull(),
  isPopular: integer("is_popular", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export type Food = typeof foods.$inferSelect;

// ─── Daily Logs ───
export const dailyLogs = sqliteTable("daily_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(),
  calorieGoal: integer("calorie_goal").default(2000).notNull(),
  proteinGoal: integer("protein_goal").default(60).notNull(),
  carbsGoal: integer("carbs_goal").default(250).notNull(),
  fatsGoal: integer("fats_goal").default(70).notNull(),
  streakCount: integer("streak_count").default(0).notNull(),
  pointsEarned: integer("points_earned").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull()
    .$onUpdate(() => new Date()),
});

export type DailyLog = typeof dailyLogs.$inferSelect;

// ─── Log Items (foods added to daily log) ───
export const logItems = sqliteTable("log_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  logId: integer("log_id").notNull(),
  foodId: integer("food_id").notNull(),
  quantity: real("quantity").default(1.0).notNull(),
  calories: integer("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fats: real("fats").notNull(),
  mealType: text("meal_type", { enum: ["breakfast", "lunch", "dinner", "snack"] }).notNull(),
  loggedAt: integer("logged_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export type LogItem = typeof logItems.$inferSelect;

// ─── Scan History ───
export const scanHistory = sqliteTable("scan_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  imageUrl: text("image_url").notNull(),
  detectedFood: text("detected_food").notNull(),
  confidence: real("confidence"),
  calories: integer("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fats: real("fats").notNull(),
  fullResult: text("full_result", { mode: "json" }),
  isAddedToLog: integer("is_added_to_log", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export type ScanHistory = typeof scanHistory.$inferSelect;

// ─── Badges (gamification) ───
export const badges = sqliteTable("badges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  color: text("color").default("#c2410c").notNull(),
  requirementType: text("requirement_type").notNull(),
  requirementValue: integer("requirement_value").notNull(),
  points: integer("points").default(10).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export type Badge = typeof badges.$inferSelect;

// ─── User Badges ───
export const userBadges = sqliteTable("user_badges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  badgeId: integer("badge_id").notNull(),
  earnedAt: integer("earned_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export type UserBadge = typeof userBadges.$inferSelect;

// ─── User Settings ───
export const userSettings = sqliteTable("user_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().unique(),
  calorieGoal: integer("calorie_goal").default(2000).notNull(),
  proteinGoal: integer("protein_goal").default(60).notNull(),
  carbsGoal: integer("carbs_goal").default(250).notNull(),
  fatsGoal: integer("fats_goal").default(70).notNull(),
  dietaryPreference: text("dietary_preference", { enum: ["none", "vegetarian", "vegan", "gluten_free"] }).default("none").notNull(),
  healthCondition: text("health_condition", { enum: ["none", "diabetes", "heart_health", "weight_loss", "muscle_gain"] }).default("none").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull()
    .$onUpdate(() => new Date()),
});

export type UserSettings = typeof userSettings.$inferSelect;
