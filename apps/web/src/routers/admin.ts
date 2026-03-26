import { createTrpcRouter, protectedProcedure } from "#src/trpc";
import { refresh } from "workflows/refresh-channel-uploads";
import { refreshSubscriptions } from "workflows/refresh-user-subscriptions";

export const adminRouter = createTrpcRouter({
    refreshChannelUploads: protectedProcedure.mutation(async () => {
        await refresh();
    }),
    refreshUserSubscriptions: protectedProcedure.mutation(async ({ ctx }) => {
        await refreshSubscriptions(ctx.session.userId);
    }),
});
