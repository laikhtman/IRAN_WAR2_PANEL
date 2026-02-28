import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;
const TV_BREAKPOINT = 1920;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIsTablet(w >= MOBILE_BREAKPOINT && w < TABLET_BREAKPOINT);
    };
    const mql = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`);
    mql.addEventListener("change", check);
    check();
    return () => mql.removeEventListener("change", check);
  }, []);

  return isTablet;
}

export function useIsTv() {
  const [isTv, setIsTv] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${TV_BREAKPOINT}px)`);
    const onChange = () => setIsTv(mql.matches);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isTv;
}

export function useBreakpoint(): "mobile" | "tablet" | "desktop" | "tv" {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isTv = useIsTv();

  if (isMobile) return "mobile";
  if (isTablet) return "tablet";
  if (isTv) return "tv";
  return "desktop";
}
