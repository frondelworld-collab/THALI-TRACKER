import { authRouter } from "./auth-router";
import { foodRouter } from "./food-router";
import { logRouter } from "./log-router";
import { scanRouter } from "./scan-router";
import { badgeRouter } from "./badge-router";
import { settingsRouter } from "./settings-router";
import { dashboardRouter } from "./dashboard-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  food: foodRouter,
  log: logRouter,
  scan: scanRouter,
  badge: badgeRouter,
  settings: settingsRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
