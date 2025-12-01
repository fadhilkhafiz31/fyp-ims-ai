import { createContext, useContext, useEffect, useState } from "react";

const DarkModeContext = createContext();

export function useDarkMode() {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error("useDarkMode must be used within DarkModeProvider");
  }
  return context;
}

export function DarkModeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first, then system preference
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) {
      return saved === "true";
    }
    // Default to system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    // Apply dark mode class to html element
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    // Save to localStorage
    localStorage.setItem("darkMode", isDarkMode.toString());
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}
