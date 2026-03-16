"use client";

import { useQuery } from "@tanstack/react-query";
// import type { CSSProperties } from "react";
import { useTrpc } from "#src/trpc/react";

export default function Home() {
    const api = useTrpc();
    const { data, isLoading } = useQuery(api.auth.getSession.queryOptions());

    if (isLoading) {
        return <div>pooppoo</div>;
    }

    if (data === undefined) {
        return <div>bad data</div>;
    }

    console.table(data);

    return (
        <main className="flex h-full w-full items-center justify-center">
            {data !== null ? (
                <a
                    className="rounded-md bg-slate-600 p-2"
                    href="/api/auth/logout"
                >
                    Log Me The Fuck OUT Samurai
                </a>
            ) : (
                <a
                    className="rounded-md bg-slate-600 p-2"
                    href="/api/auth/login"
                >
                    Log Me The Fuck In Samurai
                </a>
            )}
        </main>
    );
}
