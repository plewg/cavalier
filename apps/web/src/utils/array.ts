export function chunk<T>(arr: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];

    for (let i = 0; i < arr.length; i += chunkSize) {
        chunks.push(arr.slice(i, i + chunkSize));
    }

    return chunks;
}

export async function asyncForEach<T>(
    iterable: AsyncIterable<T> | Iterable<T>,
    maxConcurrent: number,
    callback: (element: T) => Promise<void>,
) {
    const promises = new Set<Promise<void>>();

    for await (const element of iterable) {
        const promise = callback(element).finally(() => {
            // remove current promise from promises
            promises.delete(promise);
        });

        promises.add(promise);

        if (promises.size >= maxConcurrent) {
            // wait for any promise to finish before adding more
            await Promise.race(promises);
        }
    }

    // wait for remaining promises to finish
    await Promise.all(promises);
}
