import type { youtube_v3 } from "@googleapis/youtube";
import { youtube } from "@googleapis/youtube";
import type { PrismaClient, User } from "@prisma/client";
import type { OAuth2Client } from "google-auth-library";
import z from "zod";
import { env } from "#src/env";
import { createTrpcRouter, protectedProcedure } from "#src/trpc";
import { UnreachableError } from "#src/utils/errors";
import { createGoogleClientForSession } from "#src/youtube/google";

const PAGE_SIZE = 100;

export const videoRouter = createTrpcRouter({
    feed: protectedProcedure
        .input(
            z
                .object({
                    cursor: z.object({ id: z.string() }).optional(),
                    sortDirection: z.enum(["asc", "desc"]),
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

            const nextCursor = videos[videos.length - 1]?.id;

            return { videos: videos.slice(0, PAGE_SIZE), nextCursor };
        }),
    hide: protectedProcedure
        .input(z.object({ videoId: z.string(), save: z.boolean() }))
        .mutation(
            async ({ ctx: { session, prisma }, input: { videoId, save } }) => {
                const client = createGoogleClientForSession(session);

                if (save) {
                    const youtubeApi = youtube("v3");

                    const watchLaterPlaylistId =
                        session.user.watchLaterPlaylistId ??
                        (await createWatchLaterPlaylist(
                            session.user,
                            client,
                            youtubeApi,
                            prisma,
                        ));

                    console.log(`Saving video ${videoId} to watch later`);
                    await youtubeApi.playlistItems.insert({
                        auth: client,
                        part: ["snippet"],
                        requestBody: {
                            snippet: {
                                playlistId: watchLaterPlaylistId,
                                resourceId: {
                                    kind: "youtube#video",
                                    videoId,
                                },
                            },
                        },
                    });
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

async function createWatchLaterPlaylist(
    user: User,
    client: OAuth2Client,
    youtubeApi: youtube_v3.Youtube,
    prisma: PrismaClient,
) {
    const title =
        env.DEPLOYMENT_ENVIRONMENT === "production"
            ? "Cavalier Watch Later"
            : `Cavalier Watch Later - ${env.DEPLOYMENT_ENVIRONMENT}`;

    console.log(`Creating watch later playlist for ${user.id}`);
    const res = await youtubeApi.playlists.insert({
        auth: client,
        part: ["id", "snippet", "status"],
        requestBody: {
            snippet: {
                title,
            },
            status: {
                privacyStatus: "unlisted",
            },
        },
    });

    if (res.data.id == null) {
        throw new UnreachableError("'id' missing on playlist response");
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { watchLaterPlaylistId: res.data.id },
    });

    return res.data.id;
}
