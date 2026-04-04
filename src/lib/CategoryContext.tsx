"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Category, CategoryConfig, CATEGORIES } from "./categories";

interface CategoryContextType {
  category: Category;
  config: CategoryConfig;
  setCategory: (c: Category) => void;
}

const CategoryContext = createContext<CategoryContextType>({
  category: "wine",
  config: CATEGORIES.wine,
  setCategory: () => {},
});

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [category, setCategoryState] = useState<Category>("wine");

  useEffect(() => {
    const saved = localStorage.getItem("beverage-category") as Category | null;
    if (saved && CATEGORIES[saved]) {
      setCategoryState(saved);
    }
  }, []);

  // Apply accent color CSS variables based on category
  useEffect(() => {
    const cfg = CATEGORIES[category];
    const root = document.documentElement;
    root.style.setProperty("--color-gold", cfg.accentColor);
    root.style.setProperty("--color-gold-light", cfg.accentColor);
    root.style.setProperty("--color-gold-muted", cfg.accentMuted);
    root.style.setProperty("--color-gold-subtle", cfg.bgTint);
    root.style.setProperty("--color-border-accent", cfg.accentMuted);
  }, [category]);

  const setCategory = useCallback((c: Category) => {
    setCategoryState(c);
    localStorage.setItem("beverage-category", c);
  }, []);

  return (
    <CategoryContext.Provider value={{ category, config: CATEGORIES[category], setCategory }}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategory() {
  return useContext(CategoryContext);
}
