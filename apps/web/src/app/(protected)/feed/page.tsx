"use client";

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { Duration } from "luxon";
import { useEffect, useState } from "react";
import {
    FiArrowDown,
    FiArrowUp,
    FiCheck,
    FiChevronDown,
    FiChevronUp,
    FiEyeOff,
    FiLoader,
    FiPlus,
} from "react-icons/fi";
import { z } from "zod";
import type { RouterOutputs } from "#src/routers/root";
import { useTrpc } from "#src/trpc/react";
import { UnreachableError } from "#src/utils/errors";
import { useDebounce } from "#src/utils/use-debounce";
import { useQueryParamState } from "#src/utils/use-query-param-state";

export default function Home() {
    const [sortDirection, setSortDirection] = useQueryParamState(
        "sort",
        z.enum(["asc", "desc"]),
        "asc",
    );
    const [channelIds, setChannelIds] = useQueryParamState<string[]>(
        "channels",
        z.array(z.string()),
        [],
    );
    const [videoState, setVideoState] = useQueryParamState(
        "state",
        z.enum(["new", "hidden", "saved"]),
        "new",
    );

    // The query param state is used to control the input, the URL, and the
    // initial filter state, but is not used for the filter directly, so that
    // we can debounce that separately
    const [urlTitleFilter, setUrlTitleFilter] = useQueryParamState(
        "title",
        z.string(),
        "",
    );
    const [titleFilter, setTitleFilter] = useDebounce(300, urlTitleFilter);

    const api = useTrpc();
    const queryClient = useQueryClient();

    const videoQueryOptions = api.video.feed.infiniteQueryOptions(
        {
            sortDirection,
            channelIds: channelIds.length > 0 ? channelIds : undefined,
            title: titleFilter,
            videoState,
        },
        {
            getNextPageParam: (lastPage) => {
                return lastPage.nextCursor !== undefined
                    ? {
                          id: lastPage.nextCursor,
                      }
                    : undefined;
            },
        },
    );
    const videoFeed = useInfiniteQuery(videoQueryOptions);
    const subscriptionList = useQuery(api.subscription.list.queryOptions());

    const { mutate: hideVideo } = useMutation(
        api.video.hide.mutationOptions({
            async onMutate({ videoId }) {
                await queryClient.cancelQueries({
                    queryKey: videoQueryOptions.queryKey,
                });

                queryClient.setQueryData(videoQueryOptions.queryKey, (old) => {
                    if (old === undefined) {
                        throw new UnreachableError(
                            "There must be videos loaded in order to hide a video",
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
        <main className="h-full min-h-full p-4">
            <div
                className={`box-content flex ${videoFeed.data === undefined ? "h-full" : ""} min-h-full flex-col items-center justify-start gap-8 pb-[100svh]`}
            >
                {subscriptionList.isPending ||
                subscriptionList.data === undefined ? (
                    <div className="flex h-full w-full -translate-y-36 flex-col items-center justify-center">
                        <FiLoader size={30} className="animate-spin" />
                    </div>
                ) : (
                    <>
                        <SubscriptionBar
                            selected={channelIds}
                            onClick={(channelId) => {
                                setChannelIds((prev) => {
                                    if (prev.includes(channelId)) {
                                        return prev.filter(
                                            (id) => id !== channelId,
                                        );
                                    } else {
                                        return [...prev, channelId];
                                    }
                                });
                            }}
                            subscriptions={subscriptionList.data.subscriptions}
                        />
                        <div className="flex w-full max-w-[480] flex-row flex-wrap justify-between gap-4 lg:w-[996] lg:max-w-full lg:flex-nowrap xl:w-[1248]">
                            <input
                                className="h-11 basis-full rounded-md px-2 py-1 text-slate-900 lg:w-full"
                                onChange={(event) => {
                                    setUrlTitleFilter(event.target.value);
                                    setTitleFilter(event.target.value);
                                }}
                                value={urlTitleFilter}
                                type="text"
                            />
                            <div className="flex flex-row justify-start gap-4 lg:px-10">
                                <button
                                    className={`flex justify-center rounded-md border-2 p-3 text-center ${videoState === "new" ? "border-blue-800 bg-blue-400" : "border-gray-600 bg-gray-900"}`}
                                    type="button"
                                    onClick={() => setVideoState("new")}
                                    title="Show new videos"
                                >
                                    <FiPlus />
                                </button>
                                <button
                                    className={`flex justify-center rounded-md border-2 p-3 text-center ${videoState === "saved" ? "border-green-800 bg-green-600" : "border-gray-600 bg-gray-900"}`}
                                    type="button"
                                    onClick={() => setVideoState("saved")}
                                    title="Show saved videos"
                                >
                                    <FiCheck />
                                </button>
                                <button
                                    className={`flex justify-center rounded-md border-2 p-3 text-center ${videoState === "hidden" ? "border-red-800 bg-red-600" : "border-gray-600 bg-gray-900"}`}
                                    type="button"
                                    onClick={() => setVideoState("hidden")}
                                    title="Show hidden videos"
                                >
                                    <FiEyeOff />
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSortDirection(
                                        sortDirection === "asc"
                                            ? "desc"
                                            : "asc",
                                    );
                                }}
                                className="flex justify-center rounded-md border-2 border-gray-600 p-3 text-center"
                            >
                                {sortDirection === "asc" ? (
                                    <FiArrowUp />
                                ) : (
                                    <FiArrowDown />
                                )}
                            </button>
                        </div>
                        {videoFeed.data === undefined ? (
                            <div className="flex h-full w-full -translate-y-36 flex-col items-center justify-center">
                                <FiLoader
                                    size={30}
                                    className="anim-translate-y-36 ate-spin"
                                />
                            </div>
                        ) : (
                            <div className="mx-auto flex w-full max-w-[480] flex-col items-center gap-3 lg:w-[996] lg:max-w-max xl:w-[1248]">
                                <div className="grid w-full max-w-7xl grid-cols-1 gap-3 gap-y-8 lg:grid-cols-4 xl:grid-cols-5">
                                    {videoFeed.data.pages.map(({ videos }) => {
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
                                    {videoFeed.hasNextPage ? (
                                        <button
                                            type="button"
                                            disabled={videoFeed.isFetching}
                                            onClick={() =>
                                                void videoFeed.fetchNextPage()
                                            }
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
                    </>
                )}
            </div>
        </main>
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

    const saved = video.userVideo?.saved === true;
    const hidden = video.userVideo?.saved === false;

    return (
        <div
            key={video.id}
            className="flex w-full max-w-[480] flex-col gap-2 lg:w-[240]"
        >
            <div className="relative flex">
                <div className="relative overflow-clip rounded-md">
                    <img
                        className="aspect-video w-full object-cover"
                        src={video.thumbnailUrl}
                    />
                    {saved || hidden ? (
                        <div className="absolute top-0 h-full w-full">
                            <div
                                style={{
                                    clipPath: "polygon(0 0, 100% 100%, 100% 0)",
                                    height: "40%",
                                }}
                                className={`flex items-start justify-end ${saved ? "bg-green-600" : "bg-red-600"} absolute right-0 top-0 aspect-square -translate-y-1 translate-x-1 p-4 sm:p-5 lg:p-[10]`}
                            >
                                {saved ? (
                                    <FiCheck className="text-lg sm:text-3xl lg:text-base" />
                                ) : null}
                                {hidden ? (
                                    <FiEyeOff className="text-lg sm:text-3xl lg:text-base" />
                                ) : null}
                            </div>
                        </div>
                    ) : undefined}
                </div>

                <div className="absolute bottom-1 right-1 rounded bg-black px-1 text-sm">
                    {duration}
                </div>

                <div className="absolute flex h-full w-full flex-row opacity-0 hover:opacity-30">
                    <button
                        type="button"
                        onClick={() => {
                            onClick(video, false);
                        }}
                        className="flex-grow rounded-l-md bg-red-800 text-red-800"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            onClick(video, true);
                        }}
                        className="flex-grow rounded-r-md bg-green-800 text-green-800"
                    />
                </div>
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
                        style={{ wordBreak: "break-word" }}
                        href={`https://www.youtube.com/watch?v=${video.id}`}
                        className="line-clamp-2"
                        target="_blank"
                        title={video.title}
                        rel="noreferrer"
                    >
                        {video.title}
                    </a>
                    <a
                        style={{ wordBreak: "break-word" }}
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
    subscriptions: RouterOutputs["subscription"]["list"]["subscriptions"];
}

function SubscriptionBar({
    onClick,
    selected,
    subscriptions,
}: SubscriptionBarProps) {
    const [isExpanded, setIsExpanded] = useState(false);
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
                {subscriptions.map((subscription) => (
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
