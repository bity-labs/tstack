export function resetTemplateIds<T extends Record<string, unknown>>(
  data: T,
  arrayKey: string,
): T {
  if (!(arrayKey in data)) {
    return data;
  }

  const array = data[arrayKey];
  if (!Array.isArray(array)) {
    return data;
  }

  const idKey = arrayKey === "meters" ? "polarMeterId" : "polarProductId";

  return {
    ...data,
    [arrayKey]: array.map((item) => {
      if (item && typeof item === "object" && idKey in item) {
        return { ...item, [idKey]: null };
      }
      return item;
    }),
  };
}
