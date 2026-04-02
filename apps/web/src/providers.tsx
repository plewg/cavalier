"use client";

import type { ReactNode } from "react";
import { SessionContext } from "#src/providers/session";
import type { Session } from "#src/providers/session";
import { TrpcProvider } from "#src/trpc/react";

interface ProvidersProps {
    children: ReactNode;
    session: Session | null;
}

export function Providers({ children, session }: ProvidersProps) {
    return (
        <TrpcProvider>
            <SessionContext.Provider value={session}>
                {children}
            </SessionContext.Provider>
        </TrpcProvider>
    );
}
