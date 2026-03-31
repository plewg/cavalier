import { youtube } from "@googleapis/youtube";
import z from "zod";
import { createTrpcRouter, protectedProcedure } from "#src/trpc";
import { createGoogleClientForSession } from "#src/youtube/google";

const PAGE_SIZE = 100;

export const videoRouter = createTrpcRouter({
    feed: protectedProcedure
        .input(
            z
                .object({
                    cursor: z.object({ id: z.string() }).optional(),
                    sortDirection: z
                        .enum(["asc", "desc"])
                        .optional()
                        .default("asc"),
                })
                .optional()
                .default({ cursor: undefined, sortDirection: "asc" }),
        )
        .query(async ({ ctx, input }) => {
            const { cursor, sortDirection } = input;

            const videos = await ctx.prisma.video.findMany({
                // We fetch one extra here so that we can use it to grab the
                // cursor for the next page, then we remove it from the payload
                // sent to the client.
                take: PAGE_SIZE + 1,
                cursor,
                omit: {
                    raw: true,
                },
                include: {
                    channel: {
                        omit: {
                            raw: true,
                        },
                    },
                },
                where: {
                    channel: {
                        subscriptions: { some: { userId: ctx.session.userId } },
                    },
                    userVideos: {
                        none: { userId: ctx.session.userId },
                    },
                },
                orderBy: [{ publishedAt: sortDirection }, { id: "asc" }],
            });

            // We grab the item at PAGE_SIZE index, rather than the item at the
            // last index, because the final page may not be a full page, and we
            // want to return `undefined` in that case to indicate that there is
            // not an additional page. If we instead grabbed the last item it
            // would incorrectly provide a cursor for another page that contains
            // only that final video, and the same cursor (theoretically
            // creating an infinite loop, albeit one dependent on user action).
            const nextCursor = videos[PAGE_SIZE]?.id;

            return { videos: videos.slice(0, PAGE_SIZE), nextCursor };
        }),
    hide: protectedProcedure
        .input(z.object({ videoId: z.string(), save: z.boolean() }))
        .mutation(
            async ({ ctx: { session, prisma }, input: { videoId, save } }) => {
                const client = createGoogleClientForSession(session);

                if (save) {
                    const youtubeApi = youtube("v3");

                    console.log(`Saving video ${videoId} to watch later`);
                    try {
                        await youtubeApi.playlistItems.insert({
                            auth: client,
                            part: ["snippet"],
                            requestBody: {
                                snippet: {
                                    playlistId:
                                        session.user.watchLaterPlaylistId,
                                    resourceId: {
                                        kind: "youtube#video",
                                        videoId,
                                    },
                                },
                            },
                        });
                    } catch (error: unknown) {
                        console.log("log", error);
                        console.error("error", error);
                        throw error;
                    }
                }

                await prisma.userVideo.create({
                    data: {
                        videoId,
                        saved: save,
                        userId: session.userId,
                    },
                });
            },
        ),
});
