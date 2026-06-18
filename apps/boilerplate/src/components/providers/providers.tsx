"use client";

import { useState, useEffect } from "react";
import type { ComponentType, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "@/config/wagmi";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { lightTheme, darkTheme } from "@/lib/rainbowkit-theme";

import "@rainbow-me/rainbowkit/styles.css";

type ThemeProviderProps = {
  attribute: "class";
  children: ReactNode;
  defaultTheme: string;
  disableTransitionOnChange: boolean;
  enableColorScheme: boolean;
  enableSystem: boolean;
};

const ThemeProvider = NextThemesProvider as ComponentType<ThemeProviderProps>;

function RainbowKitThemeProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const rainbowKitTheme = mounted && resolvedTheme === 'dark'
    ? darkTheme()
    : lightTheme();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowKitTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      <RainbowKitThemeProvider>{children}</RainbowKitThemeProvider>
    </ThemeProvider>
  );
}
