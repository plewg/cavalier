import type { youtube_v3 } from "@googleapis/youtube";
import type { Prisma } from "@prisma/client";
import { DateTime } from "luxon";
import { prisma } from "#src/db/prisma";
import { asyncForEach, chunk } from "#src/utils/array";
import { UnreachableError } from "#src/utils/errors";
import { pageSize } from "#src/youtube/google";

export async function importChannels(
    youtubeApi: youtube_v3.Youtube,
    channelIds: string[],
) {
    const channelIdChunks = chunk(channelIds, pageSize);

    await asyncForEach(channelIdChunks, 10, async (channelIdChunk) => {
        const now = DateTime.now().toJSDate();

        const res = await youtubeApi.channels.list({
            maxResults: pageSize,
            part: ["id", "snippet", "contentDetails"],
            id: channelIdChunk,
        });

        const channels = res.data.items ?? [];

        for (const channel of channels) {
            if (
                channel.id == null ||
                channel.snippet?.title == null ||
                channel.contentDetails?.relatedPlaylists?.uploads == null ||
                channel.snippet.thumbnails?.default?.url == null
            ) {
                throw new UnreachableError("required properties are missing");
            }

            const channelData = {
                id: channel.id,
                lastRefreshedAt: now,
                name: channel.snippet.title,
                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                raw: channel as Prisma.JsonObject,
                handle: channel.snippet.customUrl,
                uploadsPlaylistId:
                    channel.contentDetails.relatedPlaylists.uploads,
                profilePictureUrl: channel.snippet.thumbnails.default.url,
            } satisfies Prisma.ChannelUpdateInput;

            await prisma.channel.upsert({
                where: { id: channel.id },
                create: channelData,
                update: channelData,
            });
        }
    });
}
