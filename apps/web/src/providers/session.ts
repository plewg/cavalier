import type { Prisma } from "@prisma/client";
import { createContext } from "react";

export type Session = Prisma.SessionGetPayload<{ include: { user: true } }>;
export const SessionContext = createContext<Session | null>(null);
