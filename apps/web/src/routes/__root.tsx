/// <reference types="vite/client" />
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext, useRouteContext } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { ErrorState, NotFound } from "@/components/states";
import { TooltipProvider } from "@/components/ui/tooltip";
import { viewerQuery } from "@/hooks/queries";
import { I18nProvider, toLang } from "@/lib/i18n";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ context }) => ({ viewer: await context.queryClient.ensureQueryData(viewerQuery) }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lastro" },
      { name: "description", content: "Requirements, evidence and quality gates for AI-driven development." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ({ error, reset }) => <ErrorState error={error instanceof Error ? error : new Error(String(error))} reset={reset} />,
});

function RootComponent() {
  const { queryClient, viewer } = useRouteContext({ from: "__root__" });
  const lang = toLang(viewer.preferences.lang);
  const dark = viewer.preferences.theme !== "light";
  return (
    <html lang={lang} className={dark ? "dark" : undefined} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <I18nProvider lang={lang}>
            <TooltipProvider>
              <Shell>
                <Outlet />
              </Shell>
              <Toaster richColors position="bottom-right" theme={dark ? "dark" : "light"} />
            </TooltipProvider>
          </I18nProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
