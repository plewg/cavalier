"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

interface Props {
    children: ReactNode;
}

const LoggedOutProvider = dynamic(
    async () => (await import("./logged-out-provider")).LoggedOutProvider,
    { ssr: false },
);

export default function Layout({ children }: Props) {
    return <LoggedOutProvider>{children}</LoggedOutProvider>;
}
