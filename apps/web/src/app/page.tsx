"use client";

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { Duration } from "luxon";
import { useContext, useEffect, useState } from "react";
import {
    FiArrowDown,
    FiArrowUp,
    FiChevronDown,
    FiChevronUp,
    FiLoader,
} from "react-icons/fi";
import { SessionContext } from "#src/providers/session";
import type { RouterOutputs } from "#src/routers/root";
import { useTrpc } from "#src/trpc/react";
import { useDebounce } from "#src/utils/debounce";
import { UnreachableError } from "#src/utils/errors";

export default function Home() {
    const session = useContext(SessionContext);

    return (
        <main className="flex min-h-full flex-grow flex-row justify-center p-4">
            {session !== null ? <VideoScreen /> : undefined}
        </main>
    );
}

function VideoScreen() {
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [channelIds, setChannelIds] = useState<string[]>([]);
    const [titleFilter, setTitleFilter] = useDebounce(300, "");

    const api = useTrpc();
    const queryClient = useQueryClient();

    const queryParams = {
        sortDirection,
        filters: {
            channelIds: channelIds.length > 0 ? channelIds : undefined,
            title: titleFilter.length > 0 ? titleFilter : undefined,
        },
    };
    const videoQueryKey = api.video.feed.infiniteQueryKey(queryParams);
    const videoQueryOptions = api.video.feed.infiniteQueryOptions(queryParams, {
        getNextPageParam: (lastPage) => {
            return lastPage.nextCursor !== undefined
                ? {
                      id: lastPage.nextCursor,
                  }
                : undefined;
        },
    });
    const { data, fetchNextPage, hasNextPage, isFetching } =
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

    return (
        <div className="flex flex-col items-center justify-start gap-8 pb-[100svh]">
            <SubscriptionBar
                selected={channelIds}
                onClick={(channelId) => {
                    console.log(channelId);
                    setChannelIds((prev) => {
                        if (prev.includes(channelId)) {
                            return prev.filter((id) => id !== channelId);
                        } else {
                            return [...prev, channelId];
                        }
                    });
                }}
            />
            <div className="flex w-full max-w-[480] flex-row items-center justify-between lg:w-[996] xl:w-[1248]">
                <div className="flex">
                    <input
                        className="rounded-md px-2 py-1 text-slate-900"
                        onChange={(event) => {
                            setTitleFilter(event.target.value);
                        }}
                        type="text"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setSortDirection(
                            sortDirection === "asc" ? "desc" : "asc",
                        );
                    }}
                    className="flex justify-center rounded-md border-2 border-gray-600 p-3 text-center"
                >
                    {sortDirection === "asc" ? <FiArrowUp /> : <FiArrowDown />}
                </button>
            </div>
            {data === undefined ? (
                <div className="flex h-full -translate-y-16 items-center">
                    <FiLoader size={30} className="animate-spin" />
                </div>
            ) : (
                <div className="mx-auto flex w-full max-w-[480] flex-col items-center gap-3 lg:w-[996] lg:max-w-max xl:w-[1248]">
                    <div className="grid w-full max-w-7xl grid-cols-1 gap-3 gap-y-8 lg:grid-cols-4 xl:grid-cols-5">
                        {data.pages.map(({ videos }) => {
                            return videos.map((video) => {
                                return (
                                    <VideoTile
                                        key={video.id}
                                        video={video}
                                        onClick={(
                                            video: Video,
                                            save: boolean,
                                        ) => {
                                            hideVideo({
                                                videoId: video.id,
                                                save,
                                            });
                                        }}
                                    />
                                );
                            });
                        })}
                        {hasNextPage ? (
                            <button
                                type="button"
                                disabled={isFetching}
                                onClick={() => void fetchNextPage()}
                                className="aspect-video w-full max-w-[480] rounded-md border-2 border-gray-600 bg-gray-800 p-3 lg:w-[240]"
                            >
                                Load More
                            </button>
                        ) : (
                            <div className="flex aspect-video w-full max-w-[480] items-center justify-center rounded-md border-2 border-gray-600 bg-gray-800 p-3 lg:w-[240]">
                                Congratulations!
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

type Video = RouterOutputs["video"]["feed"]["videos"][number];

interface VideoTileProps {
    video: Video;
    onClick: (video: Video, save: boolean) => void;
}

function VideoTile({ video, onClick }: VideoTileProps) {
    const channelUrl =
        video.channel.handle !== null
            ? `https://youtube.com/${video.channel.handle}`
            : `https://youtube.com/channel/${video.channel.id}`;
    const videoDuration = Duration.fromISO(video.duration);
    const duration =
        videoDuration >= Duration.fromObject({ hours: 1 })
            ? videoDuration.toFormat("h:mm:ss")
            : videoDuration.toFormat("m:ss");

    return (
        <div
            key={video.id}
            className="flex w-full max-w-[480] flex-col gap-2 lg:w-[240]"
        >
            <div className="relative flex">
                {Boolean(duration) && (
                    <div className="absolute bottom-1 right-1 rounded bg-black px-1 text-sm">
                        {duration}
                    </div>
                )}

                <div className="absolute flex h-full w-full flex-row opacity-0 hover:opacity-30">
                    <button
                        type="button"
                        onClick={() => {
                            onClick(video, false);
                        }}
                        className="flex-grow rounded-l-md bg-red-800 text-red-800"
                    >
                        rip bozo
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onClick(video, true);
                        }}
                        className="flex-grow rounded-r-md bg-green-800 text-green-800"
                    >
                        yep sir
                    </button>
                </div>

                <img
                    className="aspect-video w-full rounded-md object-cover"
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

interface SubscriptionBarProps {
    onClick: (channelId: string) => void;
    selected: string[];
}

function SubscriptionBar({ onClick, selected }: SubscriptionBarProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const api = useTrpc();
    const { data } = useQuery(api.subscription.list.queryOptions());
    const [divRef, setDivRef] = useState<HTMLDivElement | null>(null);
    const [canExpand, setCanExpand] = useState(false);

    useEffect(() => {
        if (divRef === null) {
            return;
        }

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setCanExpand(entry.target.scrollHeight > 64);
            }
        });

        resizeObserver.observe(divRef);
        return () => {
            resizeObserver.unobserve(divRef);
        };
    }, [divRef]);

    if (data === undefined) {
        return null;
    }

    return (
        <div className="flex flex-col items-center gap-2">
            <div
                ref={setDivRef}
                style={{
                    maskImage:
                        isExpanded || !canExpand
                            ? undefined
                            : "linear-gradient(to bottom, rgba(0,0,0,1) 75%, rgba(0,0,0,0))",
                }}
                className={`${isExpanded || !canExpand ? "h-auto" : "h-16 overflow-hidden"} flex w-full flex-row flex-wrap justify-center gap-1 bg-gradient-to-b from-indigo-50 to-transparent bg-clip-text text-transparent`}
            >
                {data.subscriptions.map((subscription) => (
                    <img
                        title={subscription.channel.name}
                        onClick={() => {
                            onClick(subscription.channel.id);
                        }}
                        key={subscription.id}
                        className={`aspect-square h-12 rounded-[50%] border-2 ${selected.includes(subscription.channel.id) ? "border-red-600" : "border-indigo-50"}`}
                        src={subscription.channel.profilePictureUrl}
                    />
                ))}
            </div>
            {canExpand ? (
                <button
                    type="button"
                    onClick={() => setIsExpanded(() => !isExpanded)}
                    className="flex w-56 flex-row justify-center transition-all hover:text-purple-400"
                >
                    {isExpanded ? (
                        <FiChevronUp size="30" />
                    ) : (
                        <FiChevronDown size="30" />
                    )}
                </button>
            ) : null}
        </div>
    );
}
