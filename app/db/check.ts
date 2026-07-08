import { getDb } from "../api/queries/connection";
import { categories, foods, badges } from "./schema";
import { count } from "drizzle-orm";

async function check() {
  const db = getDb();
  const catCount = await db.select({ value: count() }).from(categories);
  const foodCount = await db.select({ value: count() }).from(foods);
  const badgeCount = await db.select({ value: count() }).from(badges);
  console.log("Categories:", catCount[0].value);
  console.log("Foods:", foodCount[0].value);
  console.log("Badges:", badgeCount[0].value);
}
check().catch(console.error);
