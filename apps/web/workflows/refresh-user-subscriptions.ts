import { youtube } from "@googleapis/youtube";
import type { Prisma } from "@prisma/client";
import { DateTime } from "luxon";
import { start } from "workflow/api";
import { refreshChannelUploads } from "./refresh-channel-uploads";
import { prisma } from "#src/db/prisma";
import { UnreachableError } from "#src/utils/errors";
import { thePaginator } from "#src/utils/pagination";
import { importChannels } from "#src/youtube/channel";
import { createGoogleClientForSession, PAGE_SIZE } from "#src/youtube/google";

export async function refreshUserSubscriptions(userId: string) {
    "use workflow";

    const user = await refreshSubscriptions(userId);

    return { userId: user.id };
}

export async function refreshSubscriptions(userId: string) {
    "use step";

    try {
        const session = await prisma.session.findFirstOrThrow({
            include: { user: true },
            where: { userId },
            orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        });

        const auth = createGoogleClientForSession(session);
        const youtubeApi = youtube({ version: "v3", auth });

        const now = DateTime.now().toJSDate();

        const subscriptions = await thePaginator(async (cursor) => {
            const res = await youtubeApi.subscriptions.list({
                maxResults: PAGE_SIZE,
                mine: true,
                pageToken: cursor,
                part: ["id", "snippet"],
            });

            return {
                data: res.data.items ?? [],
                nextCursor: res.data.nextPageToken ?? undefined,
            };
        });

        const channelIds = subscriptions
            .map((subscription) => subscription.snippet?.resourceId?.channelId)
            .filter((channelId) => channelId != null);

        await importChannels(youtubeApi, channelIds);

        const subscriptionIds = subscriptions
            .map((subscription) => subscription.id)
            .filter((id) => id != null);

        await prisma.$transaction(async (tx) => {
            // delete any subscriptions which have been removed on yt
            await tx.subscription.deleteMany({
                where: { userId, id: { notIn: subscriptionIds } },
            });

            // create any new subscriptions (skipping over existing)
            await tx.subscription.createMany({
                data: subscriptions.map((subscription) => {
                    const channelId =
                        subscription.snippet?.resourceId?.channelId;
                    if (subscription.id == null || channelId == null) {
                        throw new UnreachableError("channelId is required");
                    }

                    return {
                        channelId,
                        id: subscription.id,
                        userId,
                        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                        raw: subscription as Prisma.JsonObject,
                    } satisfies Prisma.SubscriptionCreateManyInput;
                }),
                skipDuplicates: true,
            });

            await tx.user.update({
                where: { id: userId },
                data: { lastRefreshedAt: now },
            });
        });

        await start(refreshChannelUploads, []);

        return session.user;
    } catch (error: unknown) {
        console.log("Something went wrong", error);
        throw error;
    }
}
