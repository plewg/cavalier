"use client";

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import type { RouterOutputs } from "#src/routers/root";
import { useTrpc } from "#src/trpc/react";
import { UnreachableError } from "#src/utils/errors";

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

    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

    const videoQueryKey = api.video.feed.infiniteQueryKey({});
    const queryClient = useQueryClient();
    const videoQueryOptions = api.video.feed.infiniteQueryOptions(
        {
            sortDirection,
        },
        {
            getNextPageParam: (lastPage) => ({
                id: lastPage.nextCursor,
            }),
        },
    );
    const { data, isLoading, fetchNextPage, isFetching } =
        useInfiniteQuery(videoQueryOptions);

    const { mutate: hideVideo } = useMutation(
        api.video.hide.mutationOptions({
            async onMutate({ videoId }) {
                await queryClient.cancelQueries({ queryKey: videoQueryKey });

                queryClient.setQueryData(videoQueryKey, (old) => {
                    if (old === undefined) {
                        throw new UnreachableError(
                            "Somehow there aint shit here",
                        );
                    }

                    const pages = old.pages.map((page) => {
                        return {
                            ...page,
                            videos: page.videos.filter(
                                (video) => video.id !== videoId,
                            ),
                        };
                    });

                    return { ...old, pages };
                });
            },
        }),
    );

    if (isLoading || data === undefined) {
        return <div>Loading</div>;
    }

    return (
        <div className="flex flex-col items-center gap-3">
            <button
                type="button"
                onClick={() => {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                }}
                className="flex w-48 justify-center self-end rounded-md border-2 border-gray-600 p-3 text-center"
            >
                {sortDirection === "asc"
                    ? "Sort Oldest First"
                    : "Sort Newest First"}
            </button>
            <div className="xs:grid-cols-3 grid max-w-7xl grid-cols-1 gap-3 gap-y-8 lg:grid-cols-4">
                {data.pages.map(({ videos }) => {
                    return videos.map((video) => {
                        return (
                            <VideoTile
                                key={video.id}
                                video={video}
                                onClick={(video: Video, save: boolean) => {
                                    hideVideo({ videoId: video.id, save });
                                }}
                            />
                        );
                    });
                })}
            </div>
            <button
                type="button"
                disabled={isFetching}
                onClick={() => void fetchNextPage()}
                className="flex w-48 justify-center rounded-md border-2 border-gray-600 p-3 text-center"
            >
                Load More
            </button>
        </div>
    );
}

type Video = RouterOutputs["video"]["feed"]["videos"][number];

function VideoTile({
    video,
    onClick,
}: {
    video: Video;
    onClick: (video: Video, save: boolean) => void;
}) {
    const channelUrl = `https://youtube.com/channel/${video.channel.handle ?? video.channel.id}`;

    return (
        <div key={video.id} className="flex flex-col gap-2">
            <div className="relative flex">
                <div className="absolute flex h-full w-full flex-row opacity-0 hover:opacity-30">
                    <button
                        type="button"
                        onClick={() => {
                            onClick(video, false);
                        }}
                        className="flex-grow bg-red-800 text-red-800"
                    >
                        rip bozo
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onClick(video, true);
                        }}
                        className="flex-grow bg-green-800 text-green-800"
                    >
                        yep sir
                    </button>
                </div>

                <img
                    className="aspect-video object-cover"
                    src={video.thumbnailUrl}
                />
            </div>
            <div className="flex flex-row items-start">
                <a href={channelUrl} className="flex flex-row items-center">
                    <img
                        className="aspect-square w-10 min-w-10 rounded-[50%]"
                        src={video.channel.profilePictureUrl}
                    />
                </a>
                <div className="flex flex-col items-start px-2">
                    <a
                        href={`https://www.youtube.com/watch?v=${video.id}`}
                        className="line-clamp-2"
                        target="_blank"
                        title={video.title}
                        rel="noreferrer"
                    >
                        {video.title}
                    </a>
                    <a
                        href={channelUrl}
                        className="line-clamp-1 items-center text-gray-400"
                        target="_blank"
                        title={video.channel.name}
                        rel="noreferrer"
                    >
                        {video.channel.name}
                    </a>
                </div>
            </div>
        </div>
    );
}
