export function resetTemplateIds<T extends Record<string, unknown>>(data: T, arrayKey: string): T {
  if (!(arrayKey in data)) {
    return data;
  }

  const value = data[arrayKey];
  if (!Array.isArray(value)) {
    return data;
  }
  // Array.isArray narrows `unknown` to `any[]`; keep elements explicit so the
  // items are handled as untrusted data.
  const array: unknown[] = value;

  const idKey = arrayKey === "meters" ? "polarMeterId" : "polarProductId";

  return {
    ...data,
    [arrayKey]: array.map((item) => {
      if (item && typeof item === "object" && idKey in item) {
        return { ...item, [idKey]: null };
      }
      return item;
    })
  };
}
