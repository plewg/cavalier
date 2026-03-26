"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
// import type { CSSProperties } from "react";
import { useTrpc } from "#src/trpc/react";

export default function Home() {
    const api = useTrpc();
    const { data, isLoading } = useQuery(api.auth.getSession.queryOptions());
    const { mutate: refreshUserSubscriptions } = useMutation(
        api.admin.refreshUserSubscriptions.mutationOptions(),
    );
    const { mutate: refreshChannelUploads } = useMutation(
        api.admin.refreshChannelUploads.mutationOptions(),
    );

    if (isLoading) {
        return <div>pooppoo</div>;
    }

    if (data === undefined) {
        return <div>bad data</div>;
    }

    console.table(data);

    return (
        <main className="flex h-full w-full items-center justify-center">
            {data !== null ? (
                <div className="flex flex-col gap-2">
                    <a
                        className="rounded-md bg-slate-600 p-2"
                        href="/api/auth/logout"
                    >
                        Log Me The Fuck OUT Samurai
                    </a>
                    <button
                        type="button"
                        className="rounded-md bg-green-500 p-2"
                        onClick={() => refreshUserSubscriptions()}
                    >
                        Refresh user subscriptions
                    </button>
                    <button
                        type="button"
                        className="rounded-md bg-green-500 p-2"
                        onClick={() => refreshChannelUploads()}
                    >
                        Refresh channel uploads
                    </button>
                </div>
            ) : (
                <a
                    className="rounded-md bg-slate-600 p-2"
                    href="/api/auth/login"
                >
                    Log Me The Fuck In Samurai
                </a>
            )}
        </main>
    );
}
