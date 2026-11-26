import { useCallback, useState } from "react";

/** A set of selected codes, with toggle and clear. */
export function useSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = useCallback((code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);
  const clear = useCallback(() => setSelected(new Set()), []);
  return { selected, toggle, clear };
}
