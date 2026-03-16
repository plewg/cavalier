import "#src/styles/globals.css";
import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import type { ReactNode } from "react";
import { TrpcProvider } from "#src/trpc/react";

const quicksand = Quicksand({
    subsets: ["latin"],
    variable: "--font-quicksand",
    display: "swap",
});

export const metadata: Metadata = {
    title: "cavalier",
    description: "bootstrapped with pentible/typescript-app-template",
};

interface Props {
    children: ReactNode;
}

export default function Layout({ children }: Props) {
    return (
        <html className="h-full" lang="en">
            <body
                className={`${quicksand.variable} h-full bg-indigo-900 font-sans text-indigo-50`}
            >
                <TrpcProvider>{children}</TrpcProvider>
            </body>
        </html>
    );
}
