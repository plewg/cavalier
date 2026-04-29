"use client";

import { redirect } from "next/navigation";
import { useContext } from "react";
import type { ReactNode } from "react";
import { SessionContext } from "#src/providers/session";

interface Props {
    children: ReactNode;
}

export function TheLogoutler({ children }: Props) {
    const session = useContext(SessionContext);

    const url = document.location;
    const redirectTo = `${url.pathname}${url.search}${url.hash}`;

    if (session === null) {
        redirect(
            `/api/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`,
        );
    }

    return <>{children}</>;
}
