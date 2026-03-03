"use client";

import { useState, useEffect } from "react";

export function useGraphDimensions(headerOffset: number) {
  const [size, setSize] = useState({ width: 960, height: 600 });

  useEffect(() => {
    const update = () => {
      if (typeof window === "undefined") return;
      const w = window.innerWidth;
      const h = Math.max(400, window.innerHeight - headerOffset);
      setSize({ width: w, height: h });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [headerOffset]);

  return size;
}
