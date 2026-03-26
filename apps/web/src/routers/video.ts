import z from "zod";
import { createTrpcRouter, protectedProcedure } from "#src/trpc";

const PAGE_SIZE = 20;

export const videoRouter = createTrpcRouter({
    feed: protectedProcedure
        .input(
            z
                .object({
                    cursor: z.object({ id: z.string() }).optional(),
                })
                .optional()
                .default({ cursor: undefined }),
        )
        .query(async ({ ctx, input }) => {
            const { cursor } = input;

            const videos = await ctx.prisma.video.findMany({
                // We fetch one extra here so that we can use it to grab the
                // cursor for the next page, then we remove it from the payload
                // sent to the client.
                take: PAGE_SIZE + 1,
                cursor,
                where: {
                    channel: {
                        subscriptions: { some: { userId: ctx.session.userId } },
                    },
                },
                orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
            });

            const nextCursor = videos[videos.length - 1]?.id;

            return { videos: videos.slice(0, PAGE_SIZE), nextCursor };
        }),
});
