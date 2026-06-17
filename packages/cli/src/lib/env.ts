export function generateEnv(options: {
  exampleContent: string;
  values: Record<string, string>;
}): string {
  const { exampleContent, values } = options;
  const lines = exampleContent.split("\n");

  return lines
    .map((line) => {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match) {
        const key = match[1];
        if (key in values) {
          return `${key}=${values[key]}`;
        }
      }
      return line;
    })
    .join("\n");
}
