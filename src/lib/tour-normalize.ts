export function asItemArray<T>(raw: unknown): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  return [raw as T];
}

export function getTourItemsBody<T>(data: {
  response?: { body?: { items?: { item?: unknown } } };
}): T[] {
  const item = data.response?.body?.items?.item;
  return asItemArray<T>(item);
}
