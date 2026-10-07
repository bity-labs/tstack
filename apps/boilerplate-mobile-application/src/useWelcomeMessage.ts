import { useMemo } from "react";

import { runSync } from "effect/Effect";

import { buildWelcomeMessage } from "./messages";

/** Builds the welcome screen text by running an Effect v4 program. */
export function useWelcomeMessage(appName: string): string {
  return useMemo(
    () => runSync(buildWelcomeMessage(appName)),
    [appName],
  );
}
