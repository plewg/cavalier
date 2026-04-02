import { createTrpcRouter, protectedProcedure } from "#src/trpc";

export const subscriptionRouter = createTrpcRouter({
    list: protectedProcedure.query(async ({ ctx }) => {
        const subscriptions = await ctx.prisma.subscription.findMany({
            include: { channel: true },
            where: {
                userId: ctx.session.user.id,
            },
            orderBy: { id: "asc" },
        });

        return { subscriptions };
    }),
});
