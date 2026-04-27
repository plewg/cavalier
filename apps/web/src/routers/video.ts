import { youtube } from "@googleapis/youtube";
import type { Prisma } from "@prisma/client";
import z from "zod";
import { createTrpcRouter, protectedProcedure } from "#src/trpc";
import { asyncForEach, chunk, unique } from "#src/utils/array";
import { importChannels } from "#src/youtube/channel";
import { createGoogleClientForSession } from "#src/youtube/google";
import { importVideos } from "#src/youtube/video";

const pageSize = 100;
const videoStates = ["new", "hidden", "saved"] as const;

export const videoRouter = createTrpcRouter({
    feed: protectedProcedure
        .input(
            z.object({
                cursor: z.object({ id: z.string() }).optional(),
                sortDirection: z.enum(["asc", "desc"]).default("asc"),
                channelIds: z.array(z.string()).optional(),
                title: z.string().optional(),
                videoState: z.enum(videoStates),
            }),
        )
        .query(async ({ ctx, input }) => {
            const { cursor, sortDirection, channelIds, title, videoState } =
                input;

            const videos = await ctx.prisma.video.findMany({
                // We fetch one extra here so that we can use it to grab the
                // cursor for the next page, then we remove it from the payload
                // sent to the client.
                take: pageSize + 1,
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
                    userVideos: {
                        where: {
                            userId: ctx.session.userId,
                        },
                    },
                },
                where: {
                    title: {
                        contains: title,
                        mode: "insensitive",
                    },
                    channel: {
                        subscriptions: {
                            some: { userId: ctx.session.userId },
                        },
                        id: {
                            in: channelIds,
                        },
                    },
                    userVideos:
                        // This relies on it being a valid assumption that if
                        // the video isn't new then it's one of 'saved' or
                        // 'hidden'. If a new state is introduced it will
                        // implicitly fall into the else without raising any
                        // errors, which could result in undesirable behaviour.
                        videoState === "new"
                            ? { none: { userId: ctx.session.userId } }
                            : {
                                  some: {
                                      userId: ctx.session.userId,
                                      saved: videoState === "saved",
                                  },
                              },
                },
                orderBy: [{ publishedAt: sortDirection }, { id: "asc" }],
            });

            // We grab the item at pageSize index, rather than the item at the
            // last index, because the final page may not be a full page, and we
            // want to return `undefined` in that case to indicate that there is
            // not an additional page. If we instead grabbed the last item it
            // would incorrectly provide a cursor for another page that contains
            // only that final video, and the same cursor (theoretically
            // creating an infinite loop, albeit one dependent on user action).
            const nextCursor = videos[pageSize]?.id;

            const responseVideos = videos.map((video) => {
                const userVideo = video.userVideos[0];

                return {
                    id: video.id,
                    thumbnailUrl: video.thumbnailUrl,
                    channel: video.channel,
                    title: video.title,
                    duration: video.duration,
                    userVideo,
                };
            });

            return { videos: responseVideos.slice(0, pageSize), nextCursor };
        }),
    hide: protectedProcedure
        .input(z.object({ videoId: z.string(), save: z.boolean() }))
        .mutation(
            async ({ ctx: { session, prisma }, input: { videoId, save } }) => {
                if (save) {
                    const auth = createGoogleClientForSession(session);
                    const youtubeApi = youtube({ version: "v3", auth });

                    console.log(`Saving video ${videoId} to watch later`);

                    await youtubeApi.playlistItems.insert({
                        part: ["snippet"],
                        requestBody: {
                            snippet: {
                                playlistId: session.user.watchLaterPlaylistId,
                                position: null,
                                resourceId: {
                                    kind: "youtube#video",
                                    videoId,
                                },
                            },
                        },
                    });
                }

                const data = {
                    videoId,
                    saved: save,
                    userId: session.userId,
                } satisfies Prisma.UserVideoUncheckedUpdateInput;

                await prisma.userVideo.upsert({
                    create: data,
                    update: data,
                    where: {
                        userVideos: {
                            videoId,
                            userId: session.userId,
                        },
                    },
                });
            },
        ),
    importWatchHistory: protectedProcedure
        .input(
            z.object({
                videos: z.array(
                    z.object({ channelId: z.string(), videoId: z.string() }),
                ),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // TODO: move this to a workflow

            const auth = createGoogleClientForSession(ctx.session);
            const youtubeApi = youtube({ version: "v3", auth });

            const uniqueChannelIds = input.videos
                .map((v) => v.channelId)
                .filter(unique);

            console.debug({ uniqueChannelIds });

            // query for existing channels
            const existingChannels = await ctx.prisma.channel.findMany({
                select: { id: true },
                where: { id: { in: uniqueChannelIds } },
            });
            const existingChannelIds = new Set(
                existingChannels.map((c) => c.id),
            );
            const newChannelIds = uniqueChannelIds.filter(
                (channelId) => !existingChannelIds.has(channelId),
            );

            // import channels which don't yet exist
            await importChannels(youtubeApi, newChannelIds);

            // query for existing videos
            const videoIds = input.videos.map((v) => v.videoId);
            const existingVideos = await ctx.prisma.video.findMany({
                select: { id: true },
                where: { id: { in: videoIds } },
            });
            const existingVideoIds = new Set(existingVideos.map((v) => v.id));
            const newVideoIds = videoIds.filter(
                (videoId) => !existingVideoIds.has(videoId),
            );

            // import videos which don't yet exist
            const importedVideoIds = await importVideos(
                youtubeApi,
                newVideoIds,
            );

            // mark all user videos saved
            const videoIdChunks = chunk(
                [...existingVideoIds, ...importedVideoIds],
                50,
            );
            await asyncForEach(videoIdChunks, 10, async (videoIds) => {
                for (const videoId of videoIds) {
                    const userVideo = {
                        userId: ctx.session.userId,
                        videoId,
                        saved: true,
                    } satisfies Prisma.UserVideoUncheckedUpdateInput;

                    await ctx.prisma.userVideo.upsert({
                        where: {
                            userVideos: { userId: ctx.session.userId, videoId },
                        },
                        create: userVideo,
                        update: userVideo,
                    });
                }
            });
        }),
});
