import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { env } from "#src/env";

export const PAGE_SIZE = 50;

export const idTokenSchema = z.object({ sub: z.string() });
export const tokensSchema = z.object({
    access_token: z.string(),
    refresh_token: z.string(),
    id_token: z.string(),
});

export function createGoogleClient() {
    return new OAuth2Client({
        apiKey: env.GOOGLE_API_KEY,
        clientId: env.GOOGLE_OAUTH2_CLIENT_ID,
        clientSecret: env.GOOGLE_OAUTH2_CLIENT_SECRET,
        redirectUri: `${env.APP_URL}/api/auth/callback`,
    });
}
