import "#src/styles/globals.css";
import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import type { ReactNode } from "react";
import { TrpcProvider } from "#src/trpc/react";

const atkinson = Atkinson_Hyperlegible_Next({
    subsets: ["latin"],
    variable: "--font-atkinson",
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
        <html className="h-full w-full" lang="en">
            <body
                className={`${atkinson.variable} h-full bg-gray-900 font-sans text-indigo-50`}
            >
                <TrpcProvider>{children}</TrpcProvider>
            </body>
        </html>
    );
}
