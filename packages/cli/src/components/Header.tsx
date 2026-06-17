import { Box, Text } from "ink";
import React from "react";

const version = process.env.CLI_VERSION ?? "0.0.0";
const LOGO = "TStack";

export function Header() {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="cyan">{LOGO}</Text>
      <Text dimColor>v{version} - Scaffold your next TStack project</Text>
    </Box>
  );
}
