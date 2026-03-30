"use client";

import { useMutation } from "@tanstack/react-query";
import { useTrpc } from "#src/trpc/react";

export default function Profile() {
    const api = useTrpc();
    const { mutate: refreshUserSubscriptions } = useMutation(
        api.admin.refreshUserSubscriptions.mutationOptions(),
    );
    const { mutate: refreshChannelUploads } = useMutation(
        api.admin.refreshChannelUploads.mutationOptions(),
    );

    return (
        <div>
            <button
                type="button"
                className="flex w-48 items-center justify-center rounded-md border-2 border-gray-600 bg-gray-700 p-3"
                onClick={() => refreshUserSubscriptions()}
            >
                Refresh Subscriptions
            </button>
            <button
                type="button"
                className="flex w-48 items-center justify-center rounded-md border-2 border-gray-600 bg-gray-700 p-3"
                onClick={() => refreshChannelUploads()}
            >
                Refresh Uploads
            </button>
        </div>
    );
}
