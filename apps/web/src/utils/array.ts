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

export async function asyncMap<T, U>(
    iterable: AsyncIterable<T> | Iterable<T>,
    maxConcurrent: number,
    callback: (element: T) => Promise<U>,
) {
    const results: U[] = [];
    const promises = new Set<Promise<void>>();

    let index = 0;
    for await (const element of iterable) {
        const currentIndex = index++;

        const promise = callback(element)
            .then((u) => {
                // NOTE: store at index instead of push to preserve order
                results[currentIndex] = u;
            })
            .finally(() => {
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

    return results;
}

export function unique<T>(element: T, index: number, array: T[]) {
    return array.indexOf(element) === index;
}
