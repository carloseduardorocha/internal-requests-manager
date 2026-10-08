"use client";

import { useCallback, useState } from "react";

type Chosen = { key: string; ids: number[] };

// The checked items of a list. The selection is cleared when `resetKey`
// changes (another page, filter or sort), and an id that leaves
// `selectableIds` stops counting.
export function useSelection(selectableIds: number[], resetKey: string) {
  const [chosen, setChosen] = useState<Chosen>({ key: resetKey, ids: [] });

  // Adjusting the state while rendering avoids a frame with the old selection.
  if (chosen.key !== resetKey) setChosen({ key: resetKey, ids: [] });

  const selected = Array.from(new Set(selectableIds)).filter(
    (id) => chosen.key === resetKey && chosen.ids.includes(id),
  );
  const total = new Set(selectableIds).size;
  const allSelected = total > 0 && selected.length === total;
  const someSelected = selected.length > 0 && !allSelected;

  const isSelected = (id: number) => selected.includes(id);

  const toggle = useCallback(
    (id: number) =>
      setChosen((current) => ({
        key: resetKey,
        ids:
          current.key === resetKey && current.ids.includes(id)
            ? current.ids.filter((item) => item !== id)
            : [...(current.key === resetKey ? current.ids : []), id],
      })),
    [resetKey],
  );

  const toggleAll = () =>
    setChosen({ key: resetKey, ids: allSelected ? [] : [...selectableIds] });

  const clear = useCallback(
    () => setChosen({ key: resetKey, ids: [] }),
    [resetKey],
  );

  return {
    selected,
    isSelected,
    toggle,
    toggleAll,
    clear,
    allSelected,
    someSelected,
  };
}
