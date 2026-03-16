import { createTrpcRouter, publicProcedure } from "#src/trpc.js";

export const authRouter = createTrpcRouter({
    getSession: publicProcedure.query(({ ctx }) => {
        return ctx.session ?? null;
    }),
});
