import type { youtube_v3 } from "@googleapis/youtube";
import { youtube } from "@googleapis/youtube";
import type { Prisma } from "@prisma/client";
import { DateTime } from "luxon";
import { prisma } from "#src/db/prisma";
import { UnreachableError } from "#src/utils/errors";
import { thePaginator } from "#src/utils/pagination";
import { createGoogleClient } from "#src/youtube/google";

const PAGE_SIZE = 50;

export async function refreshUserSubscriptions(userId: string) {
    "use workflow";

    const user = await refreshSubscriptions(userId);

    return { userId: user.id };
}

async function refreshSubscriptions(userId: string) {
    "use step";

    const user = await prisma.user.findUniqueOrThrow({
        include: {
            sessions: {
                orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
                take: 1,
            },
        },
        where: { id: userId },
    });

    const [session] = user.sessions;

    if (session === undefined) {
        throw new Error("No credentials for user.");
    }

    const youtubeApi = youtube("v3");
    const client = createGoogleClient();
    client.setCredentials({
        access_token: session.youtubeAccessToken,
        refresh_token: session.youtubeRefreshToken,
    });

    client.on("tokens", (tokens) => {
        void prisma.session.update({
            where: { token: session.token },
            data: {
                youtubeAccessToken: tokens.access_token ?? undefined,
                youtubeRefreshToken: tokens.refresh_token ?? undefined,
            },
        });
    });

    const subscriptions = await thePaginator(async (cursor) => {
        const res = await youtubeApi.subscriptions.list({
            auth: client,
            part: ["id", "snippet"],
            mine: true,
            maxResults: PAGE_SIZE,
            pageToken: cursor,
        });

        return {
            nextCursor: res.data.nextPageToken ?? undefined,
            data: res.data.items ?? [],
        };
    });

    const channelIds = subscriptions
        .map((subscription) => subscription.snippet?.resourceId?.channelId)
        .filter((channelId) => channelId != null);

    const channels: youtube_v3.Schema$Channel[] = [];
    for (let i = 0; i < channelIds.length; i += PAGE_SIZE) {
        const channelIdPage = channelIds.slice(i, i + PAGE_SIZE);

        const channelsRes = await youtubeApi.channels.list({
            auth: client,
            maxResults: PAGE_SIZE,
            part: ["id", "snippet", "contentDetails"],
            id: channelIdPage,
        });

        const channelsPage = channelsRes.data.items ?? [];
        channels.push(...channelsPage);
    }

    await prisma.$transaction(async (tx) => {
        const now = DateTime.now().toJSDate();
        await tx.subscription.deleteMany({ where: { userId } });

        for (const channel of channels) {
            if (
                channel.id == null ||
                channel.snippet?.title == null ||
                channel.contentDetails?.relatedPlaylists?.uploads == null
            ) {
                throw new UnreachableError("channelId is required");
            }

            await tx.channel.upsert({
                where: { id: channel.id },
                create: {
                    id: channel.id,
                    lastRefreshedAt: now,
                    name: channel.snippet.title,
                    raw: JSON.stringify(channel),
                    handle: channel.snippet.customUrl,
                    uploadsPlaylistId:
                        channel.contentDetails.relatedPlaylists.uploads,
                },
                update: {
                    lastRefreshedAt: now,
                    name: channel.snippet.title,
                    raw: JSON.stringify(channel),
                    handle: channel.snippet.customUrl,
                },
            });
        }

        await tx.subscription.createMany({
            data: subscriptions.map((subscription) => {
                const channelId = subscription.snippet?.resourceId?.channelId;
                if (subscription.id == null || channelId == null) {
                    throw new UnreachableError("channelId is required");
                }

                return {
                    channelId,
                    id: subscription.id,
                    userId,
                    raw: JSON.stringify(subscription),
                } satisfies Prisma.SubscriptionCreateManyInput;
            }),
        });

        await tx.user.update({
            where: { id: userId },
            data: { lastRefreshedAt: DateTime.now().toJSDate() },
        });
    });

    return user;
}
