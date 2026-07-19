"use client";

import Script from "next/script";
import { createElement } from "react";
import type { MapCity } from "@/lib/politix/geo";

// Wrapper do web component <sp-map> (contorno IBGE + pins). Requer d3 global.
export default function SPMap({ cities, height = 330 }: { cities: MapCity[]; height?: number | string }) {
  return (
    <>
      <Script src="https://unpkg.com/d3@7.9.0/dist/d3.min.js" strategy="afterInteractive" />
      <Script src="/sp-map.js" strategy="afterInteractive" />
      {createElement("sp-map", {
        "data-cities": JSON.stringify(cities),
        theme: "dark",
        style: { display: "block", width: "100%", height },
      })}
    </>
  );
}
