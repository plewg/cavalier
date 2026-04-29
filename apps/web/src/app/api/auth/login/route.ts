import { Buffer } from "node:buffer";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createGoogleClient } from "#src/youtube/google";

export function GET(request: NextRequest) {
    const redirectTo = request.nextUrl.searchParams.get("redirectTo") ?? "";
    const encodedRedirectTo = Buffer.from(redirectTo).toString("base64url");

    const client = createGoogleClient();
    const scopes = ["https://www.googleapis.com/auth/youtube", "openid"];
    const url = client.generateAuthUrl({
        scope: scopes,
        prompt: "consent",
        access_type: "offline",
        state: encodedRedirectTo,
    });

    return NextResponse.redirect(url);
}
