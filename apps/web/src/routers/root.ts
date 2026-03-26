import { adminRouter } from "./admin";
import { authRouter } from "#src/routers/auth";
import { createTrpcRouter } from "#src/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTrpcRouter({
    auth: authRouter,
    admin: adminRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
