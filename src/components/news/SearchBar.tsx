"use client";

import { useEffect, useState } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  debounceMs?: number;
}

/** Barre de recherche texte avec un léger anti-rebond pour éviter une requête par frappe. */
export default function SearchBar({ onSearch, debounceMs = 300 }: SearchBarProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => onSearch(value), debounceMs);
    return () => clearTimeout(timeout);
  }, [value, debounceMs, onSearch]);

  return (
    <input
      type="search"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Rechercher un lieu, un mot-clé..."
      className="w-full rounded border border-fg/15 bg-fg/5 px-3 py-2 text-sm placeholder:text-fg/40 focus:outline-none focus:ring-1 focus:ring-fg/30"
    />
  );
}
