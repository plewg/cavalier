export class UnreachableError extends Error {
    override name = "UnreachableError";
}

export function isErrorWithCode(error: unknown) {
    return error !== null && typeof error === "object" && "code" in error;
}

export const GOOGLE_SIGNED_OUT = "GOOGLE_SIGNED_OUT";
