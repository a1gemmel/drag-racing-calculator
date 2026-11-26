import { useEffect, useRef, useState } from "react";

/**
 * The rendered width (px) of the element the returned ref is attached to, kept up to date. Charts draw
 * in real pixels with it, so their text stays the same size on a phone and on a wide screen.
 */
export function useMeasuredWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const update = () => {
      const measured = Math.round(element.getBoundingClientRect().width);
      if (measured > 0) setWidth(measured);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}
