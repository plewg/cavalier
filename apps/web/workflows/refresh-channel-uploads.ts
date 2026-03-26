export async function refreshChannelUploads() {
    "use workflow";

    const channelIds = await refresh();

    return { channelIds };
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function refresh() {
    "use step";

    return [];
}
