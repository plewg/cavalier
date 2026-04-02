import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { adminRouter } from "./admin";
import { authRouter } from "#src/routers/auth";
import { subscriptionRouter } from "#src/routers/subscription";
import { videoRouter } from "#src/routers/video";
import { createTrpcRouter } from "#src/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTrpcRouter({
    auth: authRouter,
    admin: adminRouter,
    video: videoRouter,
    subscription: subscriptionRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * @example type HelloInput = RouterInputs['example']['hello']
 */
// eslint-disable-next-line import-x/no-unused-modules
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;
