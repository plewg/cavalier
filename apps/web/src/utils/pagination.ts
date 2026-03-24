export async function thePaginator<T>(
    callback: (cursor: string | undefined) => Promise<{
        data: T[];
        nextCursor: string | undefined;
    }>,
): Promise<T[]> {
    const data: T[] = [];
    let cursor: string | undefined = undefined;

    do {
        const res = await callback(cursor);
        cursor = res.nextCursor;
        data.push(...res.data);
    } while (cursor !== undefined);

    return data;
}
