import { Box, Text, useApp, useInput } from "ink";
import React, { useState } from "react";

import { StatusMessage } from "./StatusMessage.js";

export interface ErrorRecoveryProps {
  error: string;
  onRetry: () => void;
  context?: string;
}

export function ErrorRecovery({ error, onRetry, context }: ErrorRecoveryProps) {
  const { exit } = useApp();
  const [selected, setSelected] = useState<"retry" | "exit">("retry");

  useInput((input, key) => {
    if (input === "r" || input === "R") {
      onRetry();
      return;
    }

    if (input === "e" || input === "E" || input === "q" || input === "Q") {
      exit();
      return;
    }

    if (key.return) {
      if (selected === "retry") {
        onRetry();
      } else {
        exit();
      }

      return;
    }

    if (key.leftArrow || key.rightArrow || key.tab) {
      setSelected(selected === "retry" ? "exit" : "retry");
    }
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <StatusMessage status="error">{error}</StatusMessage>
      {context ? (
        <Box marginLeft={2}>
          <Text dimColor>{context}</Text>
        </Box>
      ) : null}
      <Box marginTop={1}>
        <Text bold>What would you like to do? </Text>
        <Text color={selected === "retry" ? "green" : "gray"}>[{selected === "retry" ? "R" : "r"}]etry</Text>
        <Text> / </Text>
        <Text color={selected === "exit" ? "red" : "gray"}>[{selected === "exit" ? "E" : "e"}]xit</Text>
      </Box>
    </Box>
  );
}
