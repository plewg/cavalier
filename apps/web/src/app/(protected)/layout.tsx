"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

interface Props {
    children: ReactNode;
}

const TheLogoutler = dynamic(
    async () => (await import("./the-logoutler")).TheLogoutler,
    { ssr: false },
);

export default function Layout({ children }: Props) {
    return <TheLogoutler>{children}</TheLogoutler>;
}
