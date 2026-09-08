import { Buffer } from "node:buffer";
import { youtube } from "@googleapis/youtube";
import { createId } from "@paralleldrive/cuid2";
import type { PrismaClient, User } from "@prisma/client";
import type { OAuth2Client } from "google-auth-library";
import { decode } from "jsonwebtoken";
import { Duration } from "luxon";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { prisma } from "#src/db/prisma";
import { env } from "#src/env";
import { appToken } from "#src/trpc";
import { asyncPager } from "#src/utils/async-pager";
import { UnreachableError } from "#src/utils/errors";
import {
    idTokenSchema,
    tokensSchema,
    createGoogleClient,
    pageSize,
} from "#src/youtube/google";
import { refreshUserSubscriptions } from "workflows/refresh-user-subscriptions";

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const redirectTo =
        state === null || state.length === 0
            ? null
            : Buffer.from(state, "base64url").toString();

    if (code === null) {
        throw new Error("OIDC code missing");
    }

    const client = createGoogleClient();

    // Exchange the OIDC code for the user's token, then extract the subject
    // from the id_token JWT
    const { tokens } = await client.getToken(code);
    const parsedTokens = tokensSchema.parse(tokens);
    client.setCredentials(parsedTokens);
    const decodedIdToken = decode(parsedTokens.id_token);
    const parsedIdToken = idTokenSchema.parse(decodedIdToken);

    const user = await prisma.user.findUnique({
        where: { googleId: parsedIdToken.sub },
    });

    const sessionToken = createId();
    const session = await prisma.session.create({
        include: { user: true },
        data: {
            id: createId(),
            token: sessionToken,
            youtubeAccessToken: parsedTokens.access_token,
            youtubeRefreshToken: parsedTokens.refresh_token,
            user: {
                connectOrCreate: {
                    create: {
                        id: createId(),
                        googleId: parsedIdToken.sub,
                    },
                    where: { googleId: parsedIdToken.sub },
                },
            },
        },
    });

    if (user == null) {
        await start(refreshUserSubscriptions, [session.user.id]);
    }

    if (session.user.watchLaterPlaylistId === null) {
        await createWatchLaterPlaylist(session.user, client, prisma);
    }

    const cookieStore = await cookies();
    cookieStore.set(appToken, sessionToken, {
        httpOnly: true,
        secure: true,
        maxAge: Duration.fromObject({ years: 10 }).as("seconds"),
    });

    return NextResponse.redirect(`${env.APP_URL}${redirectTo ?? "/feed"}`);
}

async function createWatchLaterPlaylist(
    user: User,
    client: OAuth2Client,
    prisma: PrismaClient,
) {
    const youtubeApi = youtube("v3");
    const playlists = await asyncPager(async (cursor) => {
        const res = await youtubeApi.playlists.list({
            mine: true,
            auth: client,
            part: ["snippet"],
            maxResults: pageSize,
            pageToken: cursor,
        });

        return {
            data: res.data.items ?? [],
            nextCursor: res.data.nextPageToken ?? undefined,
        };
    });

    const title =
        env.DEPLOYMENT_ENVIRONMENT === "production"
            ? "Cavalier Watch Later"
            : `Cavalier Watch Later - ${env.DEPLOYMENT_ENVIRONMENT}`;

    const existingPlaylist = playlists.find(
        (playlist) => playlist.snippet?.title === title,
    );

    const playlist =
        existingPlaylist ??
        (
            await youtubeApi.playlists.insert({
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
            })
        ).data;

    if (playlist.id == null) {
        throw new UnreachableError("'id' missing on playlist response");
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { watchLaterPlaylistId: playlist.id },
    });
}
