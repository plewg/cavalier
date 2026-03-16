import { NextResponse } from "next/server";
import { createGoogleClient } from "#src/youtube/google";

export function GET() {
    const client = createGoogleClient();
    const scopes = ["https://www.googleapis.com/auth/youtube", "openid"];
    const url = client.generateAuthUrl({
        scope: scopes,
        prompt: "consent",
        access_type: "offline",
    });

    return NextResponse.redirect(url);
}
