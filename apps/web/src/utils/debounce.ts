import { useRef, useState } from "react";

export function useDebounce<T>(delay: number, defaultValue: T) {
    const timeout = useRef<ReturnType<typeof setTimeout>>(null);
    const [value, setValue] = useState<T>(defaultValue);

    return [
        value,
        (newValue: T) => {
            if (timeout.current) {
                clearTimeout(timeout.current);
            }

            timeout.current = setTimeout(() => {
                setValue(newValue);
            }, delay);
        },
    ] as const;
}
