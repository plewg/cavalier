import "#src/styles/globals.css";
import { Menu } from "@base-ui/react";
import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import { cookies } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { FiExternalLink, FiMenu } from "react-icons/fi";
import { RequestStatusProvider } from "#src/app/request-status-provider";
import { prisma } from "#src/db/prisma";
import { Providers } from "#src/providers";
import { appToken } from "#src/trpc";

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

export default async function Layout({ children }: Props) {
    const session = await getSession();

    return (
        <Providers session={session}>
            <html className="h-full w-full" lang="en">
                <body
                    className={`${atkinson.variable} flex h-full min-h-full flex-col gap-10 bg-gray-900 p-4 font-sans text-indigo-50`}
                >
                    <div className="flex w-full flex-row items-center justify-between gap-2">
                        <div className="flex flex-row items-center gap-5">
                            <Link
                                href="/"
                                className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-center text-4xl font-extrabold text-transparent"
                            >
                                CAVALIER
                            </Link>
                            <RequestStatusProvider />
                        </div>

                        {session === null ? (
                            <a
                                className="w-48 items-center rounded-md border-2 border-green-600 bg-green-700 px-2 py-3 text-center"
                                href="/api/auth/login"
                            >
                                Log In
                            </a>
                        ) : (
                            <Menu.Root>
                                <Menu.Trigger
                                    render={
                                        <button
                                            className="flex justify-center self-center rounded-md border-2 border-gray-600 p-3 text-center lg:self-end"
                                            type="button"
                                        >
                                            <FiMenu />
                                        </button>
                                    }
                                />
                                <Menu.Portal>
                                    <Menu.Positioner
                                        align="end"
                                        className="w-48 rounded-md border border-gray-500 bg-gray-900 p-1"
                                    >
                                        <Menu.Popup className="p-1">
                                            {session.user
                                                .watchLaterPlaylistId !==
                                            null ? (
                                                <div>
                                                    <Menu.Group>
                                                        <Menu.Item>
                                                            <a
                                                                href={`https://youtube.com/playlist?list=${session.user.watchLaterPlaylistId}`}
                                                                className="flex flex-row items-center gap-1"
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                View Playlist
                                                                <FiExternalLink />
                                                            </a>
                                                        </Menu.Item>
                                                        <Menu.Item>
                                                            <Link href="/profile">
                                                                Profile
                                                            </Link>
                                                        </Menu.Item>
                                                    </Menu.Group>
                                                    <Menu.Separator className="my-1 h-[1] bg-gray-200" />
                                                </div>
                                            ) : undefined}
                                            <Menu.Group>
                                                <Menu.Item>
                                                    <a href="/api/auth/logout">
                                                        Log Out
                                                    </a>
                                                </Menu.Item>
                                            </Menu.Group>
                                        </Menu.Popup>
                                    </Menu.Positioner>
                                </Menu.Portal>
                            </Menu.Root>
                        )}
                    </div>
                    {children}
                </body>
            </html>
        </Providers>
    );
}

async function getSession() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(appToken);
    if (sessionCookie == null) {
        return null;
    }

    const sessionToken = sessionCookie.value;
    return await prisma.session.findUnique({
        include: { user: true },
        where: { token: sessionToken },
    });
}
