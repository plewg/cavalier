import { createId } from "@paralleldrive/cuid2";
import { prisma, appToken } from "@repo/backend";
import { decode } from "jsonwebtoken";
import { Duration } from "luxon";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env } from "#src/env";
import {
    idTokenSchema,
    tokensSchema,
    createGoogleClient,
} from "#src/youtube/google";

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get("code");
    if (code === null) {
        throw new Error("oidc code missing");
    }

    const client = createGoogleClient();

    // Exchange the OIDC code for the user's token, then extract
    // the subject from the id_token JWT
    const { tokens } = await client.getToken(code);

    const parsedTokens = tokensSchema.parse(tokens);

    client.setCredentials(parsedTokens);

    const decodedIdToken = decode(parsedTokens.id_token);

    const parsedIdToken = idTokenSchema.parse(decodedIdToken);
    const sessionToken = createId();

    await prisma.session.create({
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

    const cookieStore = await cookies();
    cookieStore.set(appToken, sessionToken, {
        httpOnly: true,
        secure: true,
        maxAge: Duration.fromObject({ years: 10 }).as("seconds"),
    });

    return NextResponse.redirect(env.APP_URL);
}
