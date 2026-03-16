import { appToken, prisma } from "@repo/backend";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "#src/env";
import { createGoogleClient } from "#src/youtube/google";

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get(appToken);
    if (!token) {
        return NextResponse.json("not ok", { status: 403 });
    }

    const session = await prisma.session.findUnique({
        where: { token: token.value },
    });

    if (session === null) {
        throw new Error("Could not find a matching session");
    }

    const client = createGoogleClient();
    await client.revokeToken(session.youtubeAccessToken);

    cookieStore.delete(appToken);
    await prisma.session.delete({
        where: { token: token.value },
    });

    return NextResponse.redirect(env.APP_URL);
}
