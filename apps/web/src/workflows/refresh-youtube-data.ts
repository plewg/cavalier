import { youtube } from "@googleapis/youtube";
import type { youtube_v3 } from "@googleapis/youtube";
import type { Prisma, Channel } from "@prisma/client";
import { DateTime } from "luxon";
import { prisma } from "#src/db/prisma";
import { unique } from "#src/utils/array";
import { asyncPager } from "#src/utils/async-pager";
import { UnreachableError, isErrorWithCode } from "#src/utils/errors";
import { importChannels } from "#src/youtube/channel";
import {
    createGoogleClientForSession,
    pageSize,
    createGoogleClient,
} from "#src/youtube/google";
import { importVideos } from "#src/youtube/video";

interface UserSubscriptions {
    userId: string;
    subscriptions: {
        raw: string;
        channelId: string;
        subscriptionId: string;
    }[];
    fetchedAt: number;
}

export async function syncAllSubscriptions() {
    "use workflow";

    const userIds = await getAllUserIds();
    const subscriptions = await fetchSubscriptions(userIds);
    await syncChannels(subscriptions);
    const newChannelIds = await updateSubscriptions(subscriptions);
    await fetchChannelUploads(newChannelIds);
}

export async function syncUserSubscriptions(userId: string) {
    "use workflow";

    const subscriptions = await fetchSubscriptions([userId]);
    await syncChannels(subscriptions);
    const newChannelIds = await updateSubscriptions(subscriptions);
    await fetchChannelUploads(newChannelIds);
}

async function getAllUserIds() {
    "use step";

    const users = await prisma.user.findMany({
        select: { id: true },
    });

    return users.map((user) => user.id);
}

// Fetch subscriptions from youtube for each user
async function fetchSubscriptions(userIds: string[]) {
    "use step";

    // Snapshot the start time before we begin making requests to the
    // YouTube API, so we don't risk missing anything that changes between
    // when we make these requests and when we save to our database.
    const now = Date.now();
    const userSubscriptions = [];

    for (const userId of userIds) {
        const session = await prisma.session.findFirstOrThrow({
            include: { user: true },
            where: { userId },
            orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        });

        const auth = createGoogleClientForSession(session);
        const youtubeApi = youtube({ version: "v3", auth });

        const subscriptions = await asyncPager(async (cursor) => {
            const res = await youtubeApi.subscriptions.list({
                maxResults: pageSize,
                mine: true,
                pageToken: cursor,
                part: ["id", "snippet"],
            });

            return {
                data: res.data.items ?? [],
                nextCursor: res.data.nextPageToken ?? undefined,
            };
        });

        userSubscriptions.push({
            userId,
            subscriptions: subscriptions.map((subscription) => {
                if (
                    subscription.id == null ||
                    subscription.snippet?.resourceId?.channelId == null
                ) {
                    throw new UnreachableError(
                        "subscription.id and channelId should always be on the YouTube API response",
                    );
                }
                return {
                    subscriptionId: subscription.id,
                    channelId: subscription.snippet.resourceId.channelId,
                    raw: JSON.stringify(subscription),
                };
            }),
            fetchedAt: now,
        });
    }

    return userSubscriptions;
}

async function syncChannels(userSubscriptions: UserSubscriptions[]) {
    "use step";

    const channelIds = userSubscriptions
        .flatMap((data) => data.subscriptions)
        .map((subscription) => subscription.channelId)
        .filter(unique);

    await importChannels(channelIds);
}

async function updateSubscriptions(userSubscriptions: UserSubscriptions[]) {
    "use step";

    const userSubPromises = userSubscriptions.map(async (data) => {
        const userId = data.userId;
        const subscriptions = data.subscriptions;

        const subscriptionIds = subscriptions.map(
            ({ subscriptionId }) => subscriptionId,
        );

        return await prisma.$transaction(async (tx) => {
            // Delete any subscriptions which have been removed on YouTube
            await tx.subscription.deleteMany({
                where: { userId, id: { notIn: subscriptionIds } },
            });

            // Create any new subscriptions (skipping over existing)
            const newChannels = await tx.subscription.createManyAndReturn({
                select: { channelId: true },
                data: subscriptions.map((subscription) => {
                    const channelId = subscription.channelId;

                    return {
                        channelId,
                        id: subscription.subscriptionId,
                        userId,
                        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                        raw: subscription as Prisma.JsonObject,
                    } satisfies Prisma.SubscriptionCreateManyInput;
                }),
                skipDuplicates: true,
            });

            await tx.user.update({
                where: { id: userId },
                data: {
                    lastRefreshedAt: new Date(data.fetchedAt),
                },
            });

            return newChannels;
        });
    });

    const results = await Promise.allSettled(userSubPromises);

    // Extract the channelIds
    return results
        .filter((result) => result.status === "fulfilled")
        .flatMap((result) => result.value)
        .map((channel) => channel.channelId)
        .filter(unique);
}

export async function fetchChannelUploads(channelIds?: string[]) {
    "use step";

    const auth = createGoogleClient();
    const youtubeApi = youtube({ version: "v3", auth });

    const channels = await prisma.channel.findMany({
        select: { id: true, uploadsPlaylistId: true, uploadsRefreshedAt: true },
        where: {
            id: channelIds === undefined ? undefined : { in: channelIds },
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

async function fetchUploadsPlaylistItems(
    youtubeApi: youtube_v3.Youtube,
    channel: Pick<Channel, "id" | "uploadsRefreshedAt" | "uploadsPlaylistId">,
) {
    try {
        return await asyncPager(async (cursor) => {
            const res = await youtubeApi.playlistItems.list({
                // This is super fragile I sure hope it doesn't change haha
                // ref: https://stackoverflow.com/q/71192605
                // But seriously the only other way to avoid shorts here is
                // to make additional requests and check for a redirect,
                // which is also terrible.
                playlistId: channel.uploadsPlaylistId.replace(/^UU/u, "UULF"),
                part: ["id", "snippet", "contentDetails"],
                pageToken: cursor,
                maxResults: pageSize,
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
