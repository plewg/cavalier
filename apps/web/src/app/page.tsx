"use client";

import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { useTrpc } from "#src/trpc/react";

export default function Home() {
    const api = useTrpc();
    const { data: user, isLoading } = useQuery(
        api.auth.getSession.queryOptions(),
    );
    const { mutate: refreshUserSubscriptions } = useMutation(
        api.admin.refreshUserSubscriptions.mutationOptions(),
    );
    const { mutate: refreshChannelUploads } = useMutation(
        api.admin.refreshChannelUploads.mutationOptions(),
    );

    if (isLoading || user === undefined) {
        return <div>Loading</div>;
    }

    return (
        <main className="flex h-full w-full flex-col items-center justify-start gap-10 p-4">
            <div className="flex h-10 w-full flex-row justify-between">
                <div className="self-start bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-center text-4xl font-extrabold text-transparent">
                    CAVALIER
                </div>
                {user === null ? (
                    <a
                        className="flex items-center rounded-md bg-green-700 px-2"
                        href="/api/auth/login"
                    >
                        Log In
                    </a>
                ) : (
                    <div className="flex h-10 flex-row justify-end gap-2">
                        <button
                            type="button"
                            className="rounded-md bg-rose-800 px-2 font-medium"
                            onClick={() => refreshUserSubscriptions()}
                        >
                            Refresh Subscriptions
                        </button>
                        <button
                            type="button"
                            className="rounded-md bg-rose-800 px-2 font-medium"
                            onClick={() => refreshChannelUploads()}
                        >
                            Refresh Uploads
                        </button>
                        <a
                            className="flex items-center rounded-md bg-green-700 px-2"
                            href="/api/auth/logout"
                        >
                            Log Out
                        </a>
                    </div>
                )}
            </div>
            {user !== null ? <VideoScreen /> : undefined}
        </main>
    );
}

function VideoScreen() {
    const api = useTrpc();

    const { data, isLoading, fetchNextPage, isFetching } = useInfiniteQuery(
        api.video.feed.infiniteQueryOptions(
            {},
            {
                getNextPageParam: (lastPage) => ({
                    id: lastPage.nextCursor,
                }),
            },
        ),
    );

    if (isLoading || data === undefined) {
        return <div>Loading</div>;
    }

    return (
        <div>
            {data.pages.map(({ videos }) => {
                return videos.map((video) => (
                    <div key={video.id}>
                        {/* eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element */}
                        <img className="h-64" src={video.thumbnailUrl} />
                        {video.title}
                    </div>
                ));
            })}
            <button
                type="button"
                disabled={isFetching}
                onClick={() => void fetchNextPage()}
            >
                Load more
            </button>
        </div>
    );
}
