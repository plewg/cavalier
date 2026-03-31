import { youtube } from "@googleapis/youtube";
import type { youtube_v3 } from "@googleapis/youtube";
import type { Channel, Prisma } from "@prisma/client";
import { DateTime } from "luxon";
import { prisma } from "#src/db/prisma";
import { asyncForEach, chunk } from "#src/utils/array";
import { isErrorWithCode, UnreachableError } from "#src/utils/errors";
import { thePaginator } from "#src/utils/pagination";
import {
    createGoogleClient,
    PAGE_SIZE,
    videoSchema,
} from "#src/youtube/google";

export async function refreshChannelUploads() {
    "use workflow";

    const channelIds = await refresh();

    return { channelIds };
}

export async function refresh() {
    "use step";

    const auth = createGoogleClient();
    const youtubeApi = youtube({ version: "v3", auth });

    const channels = await prisma.channel.findMany({
        select: { id: true, uploadsPlaylistId: true, uploadsRefreshedAt: true },
        where: {
            subscriptions: { some: {} },
            OR: [
                { uploadsRefreshedAt: null },
                {
                    uploadsRefreshedAt: {
                        lt: DateTime.now().minus({ hours: 24 }).toJSDate(),
                    },
                },
            ],
        },
    });

    console.log(`Refreshing uploads for ${channels.length} channels.`);
    for (const channel of channels) {
        console.log(`[${channel.id}] Refreshing uploads for channel`);
        const now = DateTime.now().toJSDate();

        // fetch uploads playlist items
        const playlistItems = await fetchUploadsPlaylistItems(
            youtubeApi,
            channel,
        );

        const videoIds = playlistItems
            .filter(
                (item) => item.snippet?.resourceId?.kind === "youtube#video",
            )
            .map((item) => item.snippet?.resourceId?.videoId)
            .filter((videoId) => videoId != null);

        console.log(`[${channel.id}] found ${videoIds.length} items`);

        // import videos
        await importVideos(youtubeApi, videoIds);

        // mark channel uploads updated
        await prisma.channel.update({
            where: { id: channel.id },
            data: { uploadsRefreshedAt: now },
        });
    }

    return [];
}

// TODO: move
export async function importVideos(
    youtubeApi: youtube_v3.Youtube,
    videoIds: string[],
) {
    const videoIdChunks = chunk(videoIds, PAGE_SIZE);
    await asyncForEach(videoIdChunks, 10, async (videoIds) => {
        // TODO: consider logging
        // console.log(`[${channelId}] fetching video details`);
        const now = DateTime.now().toJSDate();

        const res = await youtubeApi.videos.list({
            id: videoIds,
            part: ["id", "snippet", "contentDetails", "status"],
            maxResults: PAGE_SIZE,
        });

        const videos = res.data.items ?? [];

        await prisma.video.createMany({
            data: videos.map((video) => {
                const parsedVideo = videoSchema.parse(video);

                return {
                    channelId: parsedVideo.snippet.channelId,
                    duration: parsedVideo.contentDetails.duration,
                    id: parsedVideo.id,
                    isShort: false,
                    lastRefreshedAt: now,
                    liveBroadcastContent:
                        parsedVideo.snippet.liveBroadcastContent,
                    privacyStatus: parsedVideo.status.privacyStatus,
                    publishedAt: DateTime.fromISO(
                        parsedVideo.snippet.publishedAt,
                    ).toJSDate(),
                    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                    raw: video as Prisma.JsonObject,
                    thumbnailUrl: parsedVideo.snippet.thumbnails.high.url,
                    title: parsedVideo.snippet.title,
                    uploadStatus: parsedVideo.status.uploadStatus,
                } satisfies Prisma.VideoCreateManyInput;
            }),
            skipDuplicates: true,
        });
    });
}

async function fetchUploadsPlaylistItems(
    youtubeApi: youtube_v3.Youtube,
    channel: Pick<Channel, "id" | "uploadsRefreshedAt" | "uploadsPlaylistId">,
) {
    try {
        return await thePaginator(async (cursor) => {
            const res = await youtubeApi.playlistItems.list({
                // This is super fragile I sure hope it doesn't change haha
                // ref: https://stackoverflow.com/q/71192605
                // But seriously the only other way to avoid shorts here is
                // to make additional requests and check for a redirect,
                // which is also terrible.
                playlistId: channel.uploadsPlaylistId.replace(/^UU/u, "UULF"),
                part: ["id", "snippet", "contentDetails"],
                pageToken: cursor,
                maxResults: PAGE_SIZE,
            });

            const items = res.data.items ?? [];

            // If this is our first refresh `uploadsRefreshedAt` will be
            // null, so we coalesce to the unix epoch because youtube aint
            // that old baby.
            const lastRefresh = DateTime.fromJSDate(
                channel.uploadsRefreshedAt ?? new Date(0),
            );

            // We just need to check if we've passed the last
            // `uploadsRefreshedAt` time, not by how many items we passed
            // it. Because the items are returned from the YouTube API
            // ordered newest to oldest, we can simply check the last item.
            const oldestItem = items[items.length - 1];
            const oldestPublishedAt = oldestItem?.snippet?.publishedAt;
            if (oldestPublishedAt == null) {
                throw new UnreachableError(
                    `missing 'publishedAt' on item ${JSON.stringify(oldestItem)}`,
                );
            }

            const published = DateTime.fromISO(oldestPublishedAt);
            const nextCursor =
                published < lastRefresh
                    ? undefined
                    : (res.data.nextPageToken ?? undefined);

            for (const item of items) {
                const snippetPublishedAt = item.snippet?.publishedAt;
                const contentDetailsPublishedAt =
                    item.contentDetails?.videoPublishedAt;

                // TODO: investigate if we've seen this
                if (snippetPublishedAt !== contentDetailsPublishedAt) {
                    console.debug(
                        `published timestamp mismatch for item ${JSON.stringify(item)}`,
                    );
                }
            }

            console.log(`[${channel.id}] fetched ${items.length} items`);

            return { nextCursor, data: items };
        });
    } catch (error: unknown) {
        if (isErrorWithCode(error) && error.code === 404) {
            console.log("ERROR", error);

            // 404 on playlist items means the channel has not uploaded anything public
            return [];
        } else {
            throw error;
        }
    }
}
