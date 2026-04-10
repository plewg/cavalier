"use client";

import { useMutation } from "@tanstack/react-query";
import { FiRefreshCw } from "react-icons/fi";
import { useTrpc } from "#src/trpc/react";

export default function Profile() {
    const api = useTrpc();
    const refreshUserSubscriptions = useMutation(
        api.admin.refreshUserSubscriptions.mutationOptions(),
    );
    const refreshChannelUploads = useMutation(
        api.admin.refreshChannelUploads.mutationOptions(),
    );

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
                />
                <span>Refresh Subscriptions</span>
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
                />
                <span>Refresh Uploads</span>
            </button>
        </div>
    );
}
