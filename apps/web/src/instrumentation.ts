import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = (
    err,
    request,
    context,
) => {
    console.error("REQUEST ERROR", err, JSON.stringify({ request, context }));
};
