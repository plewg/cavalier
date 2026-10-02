"use client";

import { redirect } from "next/navigation";
import { useContext } from "react";
import type { ReactNode } from "react";
import { SessionContext } from "#src/providers/session";

interface Props {
    children: ReactNode;
}

// NOTE: This is only a requirement because this app isn't verified by google,
// so we're not able to refresh the session
const maxAge = new Date(Date.now() - 1000 * 86400 * 5);

export function LoggedOutProvider({ children }: Props) {
    const session = useContext(SessionContext);

    const url = document.location;
    const redirectTo = `${url.pathname}${url.search}${url.hash}`;

    if (session === null || session.createdAt < maxAge) {
        redirect(
            `/api/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`,
        );
    }

    return <>{children}</>;
}
