import { Box, Text, useInput } from "ink";
import React, { useCallback, useState } from "react";

export interface MultiSelectOption {
  label: string;
  value: string;
}

export interface MultiSelectProps {
  label: string;
  items: MultiSelectOption[];
  onSubmit: (selectedValues: string[]) => void;
  initialSelected?: string[];
}

export function MultiSelect({ label, items, onSubmit, initialSelected = [] }: MultiSelectProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set(initialSelected));

  useInput(
    useCallback(
      (input: string, key) => {
        if (items.length > 0 && (key.upArrow || input === "k")) {
          setHighlightedIndex((previousIndex) =>
            previousIndex <= 0 ? items.length - 1 : previousIndex - 1,
          );
        }

        if (items.length > 0 && (key.downArrow || input === "j")) {
          setHighlightedIndex((previousIndex) =>
            previousIndex >= items.length - 1 ? 0 : previousIndex + 1,
          );
        }

        if (input === " ") {
          const item = items[highlightedIndex];

          if (item) {
            setSelectedValues((previousValues) => {
              const nextValues = new Set(previousValues);

              if (nextValues.has(item.value)) {
                nextValues.delete(item.value);
              } else {
                nextValues.add(item.value);
              }

              return nextValues;
            });
          }
        }

        if (key.return) {
          onSubmit(Array.from(selectedValues));
        }
      },
      [highlightedIndex, items, onSubmit, selectedValues],
    ),
  );

  return (
    <Box flexDirection="column">
      <Text bold color="blue">
        {label}
      </Text>
      <Text dimColor>(↑↓ navigate, space toggle, enter confirm)</Text>
      <Box flexDirection="column" marginTop={1}>
        {items.map((item, index) => {
          const isHighlighted = index === highlightedIndex;
          const isSelected = selectedValues.has(item.value);

          return (
            <Box key={item.value}>
              <Text color={isHighlighted ? "blue" : undefined}>{isHighlighted ? "❯ " : "  "}</Text>
              <Text color={isHighlighted ? "blue" : undefined}>{isSelected ? "◉ " : "○ "}</Text>
              <Text color={isHighlighted ? "blue" : undefined} bold={isHighlighted}>
                {item.label}
              </Text>
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          Selected: {selectedValues.size} item{selectedValues.size === 1 ? "" : "s"}
        </Text>
      </Box>
    </Box>
  );
}
