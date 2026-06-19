"use client";

import type { ComponentType } from "react";
import Script from "next/script";

import { env } from "@/config";
import { logger } from "@/lib/logger";

type UmamiScriptProps = {
  "data-website-id": string;
  src: string;
  strategy: "afterInteractive";
};

// Cast is required because Next.js 15.5.19 Script types are incompatible with
// React 19's ComponentType for custom data attributes (data-website-id).
const UmamiScript = Script as ComponentType<UmamiScriptProps>;

export function AnalyticsScript() {
  // Only render Umami script when Umami is the provider and properly configured
  // PostHog is initialized via instrumentation-client.ts
  if (env.analytics.provider !== "umami") {
    return null;
  }

  if (!env.analytics.umamiWebsiteId || !env.analytics.umamiHost) {
    logger.warn("Umami analytics enabled but missing configuration", {
      umamiWebsiteId: !!env.analytics.umamiWebsiteId,
      umamiHost: !!env.analytics.umamiHost,
    });
    return null;
  }

  return (
    <UmamiScript
      src={`${env.analytics.umamiHost}/script.js`}
      data-website-id={env.analytics.umamiWebsiteId}
      strategy="afterInteractive"
    />
  );
}
