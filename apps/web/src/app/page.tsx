/* eslint-disable react/jsx-filename-extension */
"use client";

import { redirect } from "next/navigation";
import { useContext } from "react";
import { SessionContext } from "#src/providers/session";

export default function Home() {
    const session = useContext(SessionContext);

    if (session !== null) {
        redirect("/feed");
    }

    return undefined;
}
