import { useSyncExternalStore } from "react";

const STORAGE_KEY = "requests:list-query";
const LIST_PATH = "/requests";

// The list remembers its last query string, so going "back to the list" from
// the detail or a form keeps the filters. The storage can be blocked: every
// access is guarded and the list simply opens without filters.
export function saveListQuery(query: string): void {
  try {
    if (query) sessionStorage.setItem(STORAGE_KEY, query);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do: the filters just are not remembered.
  }
}

export function listHref(): string {
  try {
    const query = sessionStorage.getItem(STORAGE_KEY);
    return query ? `${LIST_PATH}?${query}` : LIST_PATH;
  } catch {
    return LIST_PATH;
  }
}

// For rendered links: the server (and hydration) always get the plain path.
export function useListHref(): string {
  return useSyncExternalStore(
    () => () => {},
    listHref,
    () => LIST_PATH,
  );
}
