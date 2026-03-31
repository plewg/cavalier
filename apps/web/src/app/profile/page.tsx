"use client";

import { useMutation } from "@tanstack/react-query";
import { FiRefreshCw, FiUpload } from "react-icons/fi";
import { useTrpc } from "#src/trpc/react";

function parseWatchHistory(html: string) {
    const parser = new DOMParser();
    const watchHistory = parser.parseFromString(html, "text/html");
    console.debug({ watchHistory });

    // all divs with direct video and channel link children
    // NOTE: some watched videos have no channel (because the channel has since
    // been deleted, we're simply skipping those)
    const videoDivs = watchHistory.querySelectorAll(
        'div:has(> a[href*="/UC"]):has(> a[href*="v="])',
    );
    const videos = videoDivs.values().map((div) => {
        // find channel/video anchors
        const channelAnchor =
            div.querySelector<HTMLAnchorElement>('a[href*="/UC"]');
        const videoAnchor =
            div.querySelector<HTMLAnchorElement>('a[href*="v="]');
        if (channelAnchor === null || videoAnchor === null) {
            throw new Error("div should include both a channel and video link");
        }

        // extract channel id
        const channelUrl = new URL(channelAnchor.href);
        const match = /\/channel\/([^/]+)/u.exec(channelUrl.pathname);
        if (match?.[1] === undefined) {
            throw new Error("link should contain a valid channel id");
        }
        const channelId = match[1];

        // extract video id
        const videoUrl = new URL(videoAnchor.href);
        const videoId = videoUrl.searchParams.get("v");
        if (videoId === null) {
            throw new Error("link should contain a valid video id");
        }

        return { channelId, videoId };
    });

    console.debug({ videos, count: videoDivs.length });

    return Array.from(videos);
}

export default function Profile() {
    const api = useTrpc();
    const refreshUserSubscriptions = useMutation(
        api.admin.refreshUserSubscriptions.mutationOptions(),
    );
    const refreshChannelUploads = useMutation(
        api.admin.refreshChannelUploads.mutationOptions(),
    );
    const importWatchHistory = useMutation(
        api.video.importWatchHistory.mutationOptions(),
    );

    async function importHistory(file: File) {
        const html = await file.text();

        await importWatchHistory.mutateAsync({
            videos: parseWatchHistory(html),
            save: true,
        });
    }

    return (
        <div className="flex flex-col gap-2 p-2 sm:items-center">
            <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-md border-2 border-gray-600 bg-gray-700 p-3 sm:w-56"
                title="Refresh your users subscriptions"
                disabled={refreshUserSubscriptions.isPending}
                onClick={() => refreshUserSubscriptions.mutate()}
            >
                <FiRefreshCw
                    className={
                        refreshUserSubscriptions.isPending ? "animate-spin" : ""
                    }
                />{" "}
                Refresh Subscriptions
            </button>
            <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-md border-2 border-gray-600 bg-gray-700 p-3 sm:w-56"
                title="Refresh all channel uploads"
                disabled={refreshChannelUploads.isPending}
                onClick={() => refreshChannelUploads.mutate()}
            >
                <FiRefreshCw
                    className={
                        refreshChannelUploads.isPending ? "animate-spin" : ""
                    }
                />{" "}
                Refresh Uploads
            </button>
            <label
                className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-gray-600 bg-gray-700 p-3 sm:w-56"
                title="ie. the watch-history.html file from Google Takeout"
            >
                <FiUpload
                    className={
                        importWatchHistory.isPending ? "animate-pulse" : ""
                    }
                />{" "}
                Import Watch History
                <input
                    className="hidden"
                    type="file"
                    accept="text/html"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file === undefined) {
                            console.info("no file selected");
                            return;
                        }

                        void importHistory(file);
                    }}
                />
            </label>
        </div>
    );
}
