import { Text } from "ink";
import React from "react";

export type StatusMessageStatus = "success" | "error" | "skip" | "info";

export interface StatusMessageProps {
  status: StatusMessageStatus;
  children: React.ReactNode;
}

const statusConfig: Record<StatusMessageStatus, { color: string; prefix: string }> = {
  success: { color: "green", prefix: "✓" },
  error: { color: "red", prefix: "✗" },
  skip: { color: "yellow", prefix: "○" },
  info: { color: "cyan", prefix: "→" },
};

export function StatusMessage({ status, children }: StatusMessageProps) {
  const { color, prefix } = statusConfig[status];

  return (
    <Text color={color}>
      {prefix} {children}
    </Text>
  );
}
