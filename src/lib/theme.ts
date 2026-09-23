"use client";

import { useEffect, useState } from "react";

export type ThemeChoice = "system" | "light" | "dark";

import { THEME_KEY as KEY } from "./theme-boot";

const read = (): ThemeChoice => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
};

const apply = (choice: ThemeChoice) => {
  const dark =
    choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  return dark;
};

export const useTheme = () => {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const c = read();
    setChoice(c);
    setDark(apply(c));
    // Follow the device when set to "system".
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => read() === "system" && setDark(apply("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const set = (c: ThemeChoice) => {
    try {
      localStorage.setItem(KEY, c);
    } catch {
      // Private browsing: the choice lasts for this page only.
    }
    setChoice(c);
    setDark(apply(c));
  };

  return { choice, dark, set };
};
