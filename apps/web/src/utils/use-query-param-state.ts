import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { z } from "zod";

export function useQueryParamState<
    T extends z.output<S> = undefined,
    S extends z.ZodType = z.ZodType,
>(
    queryParam: string,
    schema: S,
    fallbackState?: undefined,
): [T | undefined, Dispatch<SetStateAction<T | undefined>>];

export function useQueryParamState<
    T extends z.output<S> = undefined,
    S extends z.ZodType = z.ZodType,
>(
    queryParam: string,
    schema: S,
    fallbackState: T | (() => T),
): [T, Dispatch<SetStateAction<T>>];

export function useQueryParamState<
    T extends z.output<S> = undefined,
    S extends z.ZodType = z.ZodType,
>(
    queryParam: string,
    schema: S,
    fallbackState: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
    const params = useSearchParams();
    const [state, setState] = useState<T>(() => {
        const param = params.get(queryParam);
        if (param === null) {
            // NOTE: fallback could be undefined, but only in the one declaration variant
            const fallback: T = isFallbackFunction(fallbackState)
                ? fallbackState()
                : fallbackState;

            return fallback;
        }

        // TODO: consider superjson so we can persist dates/etc?
        // TODO: handle errors?
        const json: unknown = JSON.parse(param);

        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        return schema.parse(json) as T;
    });

    return [
        state,
        (value: SetStateAction<T>) => {
            const newValue = isSetStateFunction(value) ? value(state) : value;

            // update url
            const url = new URL(document.location.href);
            url.searchParams.set(queryParam, JSON.stringify(newValue));
            window.history.pushState(null, "", url);

            // set state
            setState(newValue);
        },
    ];
}

// NOTE: `typeof val === "function"` is insufficient to use directly because the
// type ends up as: `(() => T) | (T & Function)`
function isFallbackFunction<T>(val: T | (() => T)): val is () => T {
    return typeof val === "function";
}

function isSetStateFunction<T>(val: SetStateAction<T>): val is (ps: T) => T {
    return typeof val === "function";
}
