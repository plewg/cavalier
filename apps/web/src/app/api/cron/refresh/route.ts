import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { env } from "#src/env";
import { syncAllSubscriptions } from "#src/workflows/refresh-youtube-data";

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get("Authorization");
    const cronSecret = env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await start(syncAllSubscriptions);

    return NextResponse.json({ ok: true });
}
