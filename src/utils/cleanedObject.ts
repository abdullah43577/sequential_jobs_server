export function cleanObject(obj: Record<string, any>) {
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined || (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0)) {
      continue;
    }

    cleaned[key] = value;
  }

  return cleaned;
}
