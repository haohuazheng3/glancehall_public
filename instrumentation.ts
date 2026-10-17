import type { Instrumentation } from "next";

// Every unhandled server error (route handlers, server components, server actions) lands in the error inbox.
// The site has no edge routes; the runtime check also keeps node-only code out of the edge bundle.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { recordError } = await import("./lib/errors");
    await recordError({
      source: "server",
      error: err,
      route: `${request.method} ${request.path}`,
      extra: { routerKind: context.routerKind, routeType: context.routeType, routePath: context.routePath },
    });
  }
};
