import { TRPCError } from "@trpc/server";
import { createTrpcRouter, protectedProcedure } from "#src/trpc";
import { refresh } from "workflows/refresh-channel-uploads";
import { refreshSubscriptions } from "workflows/refresh-user-subscriptions";

const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
    if (!ctx.session.user.admin) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return await next();
});

export const adminRouter = createTrpcRouter({
    refreshChannelUploads: adminProcedure.mutation(async () => {
        await refresh();
    }),
    refreshUserSubscriptions: adminProcedure.mutation(async ({ ctx }) => {
        await refreshSubscriptions(ctx.session.userId);
    }),
});
