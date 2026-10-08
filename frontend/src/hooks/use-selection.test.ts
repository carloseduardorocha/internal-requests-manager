import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSelection } from "./use-selection";

function setup(ids: number[], key = "a") {
  return renderHook(({ ids, key }) => useSelection(ids, key), {
    initialProps: { ids, key },
  });
}

describe("useSelection", () => {
  it("starts with nothing selected", () => {
    const { result } = setup([1, 2, 3]);

    expect(result.current.selected).toEqual([]);
    expect(result.current.allSelected).toBe(false);
    expect(result.current.someSelected).toBe(false);
    expect(result.current.isSelected(1)).toBe(false);
  });

  it("toggles one id on and off", () => {
    const { result } = setup([1, 2, 3]);

    act(() => result.current.toggle(2));
    expect(result.current.selected).toEqual([2]);
    expect(result.current.isSelected(2)).toBe(true);
    expect(result.current.isSelected(1)).toBe(false);

    act(() => result.current.toggle(2));
    expect(result.current.selected).toEqual([]);
  });

  it("keeps selected in the order of selectableIds, whatever the click order", () => {
    const { result } = setup([1, 2, 3]);

    act(() => result.current.toggle(3));
    act(() => result.current.toggle(1));

    expect(result.current.selected).toEqual([1, 3]);
  });

  it("never repeats an id, even when selectableIds repeats it", () => {
    const { result } = setup([1, 2, 2, 3]);

    act(() => result.current.toggleAll());

    expect(result.current.selected).toEqual([1, 2, 3]);
    expect(result.current.allSelected).toBe(true);
  });

  it("is indeterminate with some, and all selected with every id", () => {
    const { result } = setup([1, 2]);

    act(() => result.current.toggle(1));
    expect(result.current.someSelected).toBe(true);
    expect(result.current.allSelected).toBe(false);

    act(() => result.current.toggle(2));
    expect(result.current.allSelected).toBe(true);
    expect(result.current.someSelected).toBe(false);
  });

  it("toggleAll selects everything, and clears when everything was selected", () => {
    const { result } = setup([1, 2, 3]);

    act(() => result.current.toggle(1));
    act(() => result.current.toggleAll());
    expect(result.current.selected).toEqual([1, 2, 3]);

    act(() => result.current.toggleAll());
    expect(result.current.selected).toEqual([]);
  });

  it("clear drops the whole selection", () => {
    const { result } = setup([1, 2, 3]);

    act(() => result.current.toggleAll());
    act(() => result.current.clear());

    expect(result.current.selected).toEqual([]);
    expect(result.current.someSelected).toBe(false);
  });

  it("is not all selected with an empty list", () => {
    const { result } = setup([]);

    expect(result.current.allSelected).toBe(false);
    expect(result.current.someSelected).toBe(false);

    act(() => result.current.toggleAll());
    expect(result.current.selected).toEqual([]);
    expect(result.current.allSelected).toBe(false);
  });

  it("clears the selection when the resetKey changes", () => {
    const { result, rerender } = setup([1, 2, 3], "page=1");

    act(() => result.current.toggleAll());
    rerender({ ids: [1, 2, 3], key: "page=2" });

    expect(result.current.selected).toEqual([]);
    expect(result.current.isSelected(1)).toBe(false);

    // and the new key starts a fresh selection
    act(() => result.current.toggle(2));
    expect(result.current.selected).toEqual([2]);
  });

  it("keeps the selection while the resetKey stays the same", () => {
    const { result, rerender } = setup([1, 2, 3], "page=1");

    act(() => result.current.toggle(2));
    rerender({ ids: [1, 2, 3], key: "page=1" });

    expect(result.current.selected).toEqual([2]);
  });

  it("stops counting an id that leaves selectableIds", () => {
    const { result, rerender } = setup([1, 2, 3]);

    act(() => result.current.toggle(1));
    act(() => result.current.toggle(2));
    rerender({ ids: [2, 3], key: "a" });

    expect(result.current.selected).toEqual([2]);
    expect(result.current.isSelected(1)).toBe(false);
    expect(result.current.someSelected).toBe(true);
    expect(result.current.allSelected).toBe(false);
  });

  it("is all selected after the unselected ids leave the list", () => {
    const { result, rerender } = setup([1, 2, 3]);

    act(() => result.current.toggle(1));
    rerender({ ids: [1], key: "a" });

    expect(result.current.allSelected).toBe(true);
  });
});
