"use client";

// import { useQuery } from "@tanstack/react-query";
import type { CSSProperties } from "react";
// import { useTrpc } from "#src/trpc/react";

export default function Home() {
    // const api = useTrpc();

    return (
        <main className="container mx-auto flex flex-col items-center p-4">
            <FontWeightPreview fontWeight="bold" />
        </main>
    );
}

interface FontWeightPreviewProps {
    fontWeight: CSSProperties["fontWeight"];
}

function FontWeightPreview({ fontWeight }: FontWeightPreviewProps) {
    return (
        <p className="text-4xl" style={{ fontWeight }}>
            font-weight-{fontWeight}
        </p>
    );
}
