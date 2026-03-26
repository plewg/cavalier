import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "#src/db/prisma";
import { env } from "#src/env";
import { appToken } from "#src/trpc";
import { createGoogleClient } from "#src/youtube/google";

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get(appToken);
    if (!token) {
        return NextResponse.json("not ok", { status: 403 });
    }

    const session = await prisma.session.findUniqueOrThrow({
        where: { token: token.value },
    });

    const client = createGoogleClient();
    client.setCredentials({
        access_token: session.youtubeAccessToken,
        refresh_token: session.youtubeRefreshToken,
    });

    await client.refreshAccessToken();

    const res = await client.revokeCredentials();
    if (!res.ok) {
        console.log("Failed to revoke access token", res);
    }

    cookieStore.delete(appToken);
    await prisma.session.delete({
        where: { token: token.value },
    });

    return NextResponse.redirect(env.APP_URL);
}
