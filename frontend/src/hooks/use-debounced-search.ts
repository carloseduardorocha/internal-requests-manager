import { useEffect, useRef, useState } from "react";

const SEARCH_DELAY_MS = 300;

// A search box whose text reaches the URL after a pause. `search` is the value
// currently in the URL; `commit` puts a new one there. The box follows changes
// that did not come from typing (clear, back button).
export function useDebouncedSearch(
  search: string,
  commit: (search: string) => void,
) {
  const [text, setText] = useState(search);
  const [seenSearch, setSeenSearch] = useState(search);
  // Last value the debounce put in the URL: when the navigation catches up
  // with it, the box already holds (or has moved past) that text.
  const [sentSearch, setSentSearch] = useState<string | null>(null);

  if (search !== seenSearch) {
    setSeenSearch(search);
    if (search === sentSearch) {
      // The URL caught up with the debounce: later changes are not ours.
      setSentSearch(null);
    } else if (search !== text.trim()) {
      setText(search);
    }
  }

  const trimmed = text.trim();

  // `commit` is rebuilt on every render: keep the latest one without
  // restarting the timer.
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });

  useEffect(() => {
    if (trimmed === search) return;

    const timer = setTimeout(() => {
      setSentSearch(trimmed);
      commitRef.current(trimmed);
    }, SEARCH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [trimmed, search]);

  // Clears the box as well as the URL state the caller owns.
  function reset() {
    setText("");
    setSentSearch(null);
  }

  return { text, setText, trimmed, reset };
}
