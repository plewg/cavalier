"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { QueryClientConfig } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { httpBatchLink, loggerLink, createTRPCClient } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import superjson from "superjson";
import { env } from "#src/env";
import type { AppRouter } from "#src/routers/root";
import { GOOGLE_SIGNED_OUT } from "#src/utils/errors";
import { useConst } from "#src/utils/use-const";

// NOTE: renamed before exporting
// eslint-disable-next-line @typescript-eslint/naming-convention
const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

// NOTE: this file shouldn't change that much, so losing fast refresh is fine
// eslint-disable-next-line react-refresh/only-export-components
export { useTRPC as useTrpc };

const createQueryClient = (options: QueryClientConfig) =>
    new QueryClient(options);

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = (options: QueryClientConfig) => {
    if (typeof window === "undefined") {
        // Server: always make a new query client
        return createQueryClient(options);
    }

    // Browser: use singleton pattern to keep the same query client
    return (clientQueryClientSingleton ??= createQueryClient(options));
};

function getBaseUrl() {
    if (typeof window !== "undefined") {
        // browser should use relative url
        return "";
    }

    return env.APP_URL;
}

interface Props {
    children: ReactNode;
}

export function TrpcProvider({ children }: Props) {
    const router = useRouter();
    const queryClient = getQueryClient({
        defaultOptions: {
            mutations: {
                onError(error) {
                    if (error.message === GOOGLE_SIGNED_OUT) {
                        router.push("/api/auth/login");
                    }
                },
            },
        },
    });

    const trpcClient = useConst(() => {
        return createTRPCClient<AppRouter>({
            links: [
                loggerLink({
                    enabled: (opts) =>
                        env.NODE_ENV === "development" ||
                        (opts.direction === "down" &&
                            opts.result instanceof Error),
                }),
                httpBatchLink({
                    url: `${getBaseUrl()}/api/trpc`,
                    transformer: superjson,
                }),
            ],
        });
    });

    return (
        <QueryClientProvider client={queryClient}>
            <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
                {children}
            </TRPCProvider>
            {env.NEXT_PUBLIC_REACT_QUERY_DEVTOOLS_ENABLED ? (
                <ReactQueryDevtools />
            ) : null}
        </QueryClientProvider>
    );
}
