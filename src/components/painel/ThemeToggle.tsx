"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";

export default function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("px-theme") === "light";
    setLight(saved);
    document.body.dataset.theme = saved ? "light" : "";
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    document.body.dataset.theme = next ? "light" : "";
    try {
      localStorage.setItem("px-theme", next ? "light" : "dark");
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      title={light ? "Tema escuro" : "Tema claro"}
      style={{ width: 34, height: 34, border: "none", background: "none", color: "var(--color-gray-900)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <Icon name={light ? "moon" : "sun"} size={17} />
    </button>
  );
}
