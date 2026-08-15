import { useEffect, useState } from "react";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);

    onChange();
    list.addEventListener("change", onChange);
    // Подстраховка: смена размера окна не всегда доходит до MediaQueryList,
    // а раскладка от неё зависит. Повторный setState тем же значением
    // React отбрасывает, так что лишних рендеров не будет.
    window.addEventListener("resize", onChange);
    return () => {
      list.removeEventListener("change", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, [query]);

  return matches;
}

/** Тач-раскладка календаря: узкий экран, где нет места встроенным редакторам. */
export function useIsMobile() {
  return useMediaQuery("(max-width: 767px)");
}
