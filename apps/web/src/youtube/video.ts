import type { youtube_v3 } from "@googleapis/youtube";
import type { Prisma } from "@prisma/client";
import { DateTime } from "luxon";
import { prisma } from "#src/db/prisma";
import { asyncMap, chunk } from "#src/utils/array";
import { PAGE_SIZE, videoSchema } from "#src/youtube/google";

export async function importVideos(
    youtubeApi: youtube_v3.Youtube,
    videoIds: string[],
) {
    const videoIdChunks = chunk(videoIds, PAGE_SIZE);
    const videoChunks = await asyncMap(videoIdChunks, 10, async (videoIds) => {
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

        return videos;
    });

    return videoChunks
        .flatMap((videos) => videos.map((video) => video.id))
        .filter((id) => id != null);
}
