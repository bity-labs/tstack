import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import React from "react";

export type Operation =
  | "add"
  | "remove"
  | "sync"
  | "regenerate"
  | "unarchive"
  | "cleanup"
  | "sync_from_sandbox";

interface OperationOption {
  label: string;
  value: Operation;
}

export interface OperationMenuProps {
  onSelect: (operation: Operation) => void;
  hasProducts: boolean;
  hasArchivedProducts?: boolean;
  showSyncFromSandbox?: boolean;
}

export function OperationMenu({
  onSelect,
  hasProducts,
  hasArchivedProducts = false,
  showSyncFromSandbox = false,
}: OperationMenuProps) {
  const options: OperationOption[] = [];

  if (showSyncFromSandbox) {
    options.push({ label: "Sync products from sandbox", value: "sync_from_sandbox" });
  }

  options.push({ label: "Add new product", value: "add" });

  if (hasProducts) {
    options.push(
      { label: "Remove products", value: "remove" },
      { label: "Sync products to Polar", value: "sync" },
    );

    if (hasArchivedProducts) {
      options.push({ label: "Unarchive products on Polar", value: "unarchive" });
    }

    options.push(
      { label: "Clean up Polar products", value: "cleanup" },
      { label: "Regenerate TypeScript exports", value: "regenerate" },
    );
  }

  const handleSelect = (item: OperationOption) => {
    onSelect(item.value);
  };

  return (
    <Box flexDirection="column">
      {!hasProducts && !showSyncFromSandbox ? (
        <Box marginBottom={1}>
          <Text color="yellow">No products found.</Text>
        </Box>
      ) : null}
      {!hasProducts && showSyncFromSandbox ? (
        <Box marginBottom={1}>
          <Text color="yellow">No products found. Sandbox products are available to sync.</Text>
        </Box>
      ) : null}
      <Text bold color="blue">
        What would you like to do?
      </Text>
      <SelectInput items={options} onSelect={handleSelect} />
    </Box>
  );
}
