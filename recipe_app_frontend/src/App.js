import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

/**
 * Local-only seed data.
 * Note: In a real app this would come from an API, but this project is frontend-only.
 */
const SEED_RECIPES = [
  {
    id: "lemon-garlic-pasta",
    title: "Lemon Garlic Pasta",
    description: "Bright, zesty pasta with garlic, herbs, and parmesan.",
    timeMinutes: 20,
    servings: 2,
    difficulty: "Easy",
    tags: ["Vegetarian", "Quick", "Dinner"],
    calories: 520,
    imageEmoji: "🍋",
    ingredients: [
      "200g spaghetti",
      "3 cloves garlic, thinly sliced",
      "2 tbsp olive oil",
      "1 lemon (zest + juice)",
      "1/4 cup grated parmesan",
      "2 tbsp chopped parsley",
      "Salt + black pepper",
      "Chili flakes (optional)",
    ],
    instructions: [
      "Boil pasta in salted water until al dente. Reserve 1/2 cup pasta water.",
      "Gently sauté garlic in olive oil until fragrant (do not brown).",
      "Toss pasta with garlic oil, lemon zest, and lemon juice.",
      "Add parmesan and a splash of pasta water to create a glossy sauce.",
      "Finish with parsley, pepper, and chili flakes to taste.",
    ],
  },
  {
    id: "rainbow-salad-bowl",
    title: "Rainbow Salad Bowl",
    description: "Crunchy veggies, creamy avocado, and a tangy herb dressing.",
    timeMinutes: 15,
    servings: 2,
    difficulty: "Easy",
    tags: ["Vegan", "Gluten-Free", "Lunch"],
    calories: 410,
    imageEmoji: "🥗",
    ingredients: [
      "2 cups mixed greens",
      "1/2 cup shredded carrots",
      "1/2 cup cucumber, sliced",
      "1/2 cup cherry tomatoes",
      "1/2 avocado, sliced",
      "2 tbsp pumpkin seeds",
      "Dressing: 2 tbsp olive oil + 1 tbsp lemon juice + 1 tsp Dijon",
      "Salt + pepper",
    ],
    instructions: [
      "Add greens and vegetables to a bowl.",
      "Whisk dressing ingredients until emulsified; season to taste.",
      "Pour dressing over salad and top with avocado and seeds.",
    ],
  },
  {
    id: "spicy-chickpea-tacos",
    title: "Spicy Chickpea Tacos",
    description: "Smoky chickpeas with crunchy slaw and lime crema (optional).",
    timeMinutes: 25,
    servings: 3,
    difficulty: "Medium",
    tags: ["Dairy-Free", "Dinner", "High-Protein"],
    calories: 560,
    imageEmoji: "🌮",
    ingredients: [
      "2 cans chickpeas, drained",
      "1 tbsp olive oil",
      "1 tsp smoked paprika",
      "1/2 tsp cumin",
      "1/2 tsp chili powder",
      "Salt",
      "6 small tortillas",
      "Slaw: shredded cabbage + lime + pinch of salt",
      "Optional: yogurt + lime for crema",
    ],
    instructions: [
      "Pat chickpeas dry, then sauté in olive oil until slightly crisp.",
      "Add spices and salt; toss until evenly coated.",
      "Warm tortillas, assemble with slaw and chickpeas.",
      "Top with crema (optional) and extra lime.",
    ],
  },
  {
    id: "berry-yogurt-parfait",
    title: "Berry Yogurt Parfait",
    description: "Layered yogurt, berries, and granola for a quick snack.",
    timeMinutes: 5,
    servings: 1,
    difficulty: "Easy",
    tags: ["Breakfast", "Snack", "No-Cook"],
    calories: 320,
    imageEmoji: "🍓",
    ingredients: [
      "1 cup Greek yogurt",
      "1/2 cup mixed berries",
      "1/3 cup granola",
      "1 tsp honey (optional)",
      "Pinch of cinnamon",
    ],
    instructions: [
      "Layer yogurt, berries, and granola in a glass.",
      "Drizzle honey if desired and sprinkle cinnamon.",
      "Serve immediately.",
    ],
  },
  {
    id: "sheet-pan-salmon",
    title: "Sheet-Pan Salmon & Veggies",
    description: "One-pan salmon with roasted vegetables and a sweet-spicy glaze.",
    timeMinutes: 30,
    servings: 2,
    difficulty: "Medium",
    tags: ["Gluten-Free", "Dinner", "Seafood"],
    calories: 610,
    imageEmoji: "🐟",
    ingredients: [
      "2 salmon fillets",
      "2 cups broccoli florets",
      "1 bell pepper, sliced",
      "1 tbsp olive oil",
      "Glaze: 1 tbsp soy sauce + 1 tsp honey + 1 tsp sriracha",
      "Salt + pepper",
      "Lemon wedges",
    ],
    instructions: [
      "Preheat oven to 220°C / 425°F. Line a sheet pan.",
      "Toss veggies with olive oil, salt, pepper. Roast 10 minutes.",
      "Add salmon and brush glaze over the top.",
      "Roast 12–14 minutes until salmon flakes easily.",
      "Serve with lemon wedges.",
    ],
  },
];

const ALL_TAG = "All";
const SHOPPING_LIST_STORAGE_KEY = "recipe_shopping_list_v1";

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim();
}

function formatMeta(recipe) {
  return `${recipe.timeMinutes} min • ${recipe.servings} servings • ${recipe.difficulty}`;
}

function buildSearchIndex(recipe) {
  const combined = [
    recipe.title,
    recipe.description,
    recipe.difficulty,
    (recipe.tags || []).join(" "),
    (recipe.ingredients || []).join(" "),
  ].join(" ");
  return normalizeText(combined);
}

/**
 * Lightweight client-side routing (no react-router dependency).
 * We use URL hash: #/recipe/<id>
 */
function getRecipeIdFromHash() {
  const hash = window.location.hash || "";
  const match = hash.match(/^#\/recipe\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function safeJsonParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function makeShoppingItemId() {
  // Good enough for local-only (no collision concerns at this scale).
  return `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Convert an ingredient line into a stable-ish key for merging.
 * We intentionally keep this simple: lowercased and trimmed.
 */
function ingredientKey(text) {
  return normalizeText(text).replace(/\s+/g, " ");
}

/**
 * Try to extract a basic "name" for display/merging by stripping leading quantity-ish tokens.
 * This is heuristic and intentionally lightweight.
 */
function ingredientDisplayName(text) {
  const raw = String(text || "").trim();
  // Remove common leading patterns like: "1/2", "2", "200g", "2 tbsp", etc.
  // We keep it conservative; if it fails, we use the full string.
  const cleaned = raw.replace(
    /^(\d+([.,]\d+)?|\d+\/\d+)\s*(x\s*)?([a-zA-Z]+)?\s*/u,
    ""
  );
  return cleaned.trim() || raw;
}

// PUBLIC_INTERFACE
function App() {
  const [theme, setTheme] = useState("light");
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState(ALL_TAG);
  const [selectedRecipeId, setSelectedRecipeId] = useState(() => getRecipeIdFromHash());

  const [favorites, setFavorites] = useState(() => {
    const raw = localStorage.getItem("recipe_favorites_v1");
    return safeJsonParse(raw, []);
  });

  /**
   * shoppingList item shape:
   * { id: string, text: string, key: string, checked: boolean, count: number, notes: string }
   */
  const [shoppingList, setShoppingList] = useState(() => {
    const raw = localStorage.getItem(SHOPPING_LIST_STORAGE_KEY);
    const parsed = safeJsonParse(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  });

  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [newShoppingText, setNewShoppingText] = useState("");

  // Cooking mode (step-by-step)
  const [isCookMode, setIsCookMode] = useState(false);
  const [cookStepIndex, setCookStepIndex] = useState(0);

  // Ingredient scaling (client-side only)
  const [servingsOverride, setServingsOverride] = useState(null);

  const searchInputRef = useRef(null);
  const shoppingInputRef = useRef(null);

  function clampServings(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.min(99, Math.round(n)));
  }

  function parseNumberToken(token) {
    const t = String(token || "").trim();

    // Mixed number: "1 1/2"
    const mixed = t.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
    if (mixed) {
      const a = Number(mixed[1]);
      const b = Number(mixed[2]);
      const c = Number(mixed[3]);
      if (Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c) && c !== 0) return a + b / c;
    }

    // Fraction: "1/2"
    const frac = t.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (frac) {
      const a = Number(frac[1]);
      const b = Number(frac[2]);
      if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return a / b;
    }

    // Decimal/comma decimal or integer: "2", "2.5", "2,5"
    const normalized = t.replace(",", ".");
    const n = Number(normalized);
    if (Number.isFinite(n)) return n;

    return null;
  }

  function formatScaledNumber(value) {
    // Keep this intentionally simple & predictable.
    // - Integers: "2"
    // - Otherwise: one decimal place, trimming trailing .0
    if (!Number.isFinite(value)) return "";
    const roundedInt = Math.round(value);
    if (Math.abs(value - roundedInt) < 1e-9) return String(roundedInt);

    const oneDec = Math.round(value * 10) / 10;
    return String(oneDec).replace(/\.0$/, "");
  }

  /**
   * Scale an ingredient line by the servings ratio.
   * We only scale a leading numeric token if present. Examples:
   * - "200g spaghetti" -> "400g spaghetti" (for 2x)
   * - "1/2 cup sugar" -> "1 cup sugar" (for 2x)
   * - "2 cans chickpeas, drained" -> "3 cans..." (for 1.5x)
   * If we can't confidently parse a leading number, we return the original line.
   */
  function scaleIngredientLine(line, scale) {
    const raw = String(line || "");
    if (!raw.trim() || !Number.isFinite(scale) || scale === 1) return raw;

    // Match a leading numeric token optionally followed by a unit stuck to it (e.g., "200g", "1.5tbsp").
    const m = raw.match(/^\s*([0-9]+(?:[.,][0-9]+)?|[0-9]+\s*\/\s*[0-9]+)([a-zA-Z]+)?(\s+.*)?$/u);
    if (!m) return raw;

    const amountToken = m[1];
    const unitSuffix = m[2] || "";
    const rest = m[3] || "";

    const amount = parseNumberToken(amountToken);
    if (amount == null) return raw;

    const scaled = amount * scale;
    const formatted = formatScaledNumber(scaled);

    return `${formatted}${unitSuffix}${rest}`;
  }

  const recipes = useMemo(() => {
    // Precompute a tiny search index so filtering stays snappy.
    return SEED_RECIPES.map((r) => ({ ...r, _searchIndex: buildSearchIndex(r) }));
  }, []);

  const tags = useMemo(() => {
    const set = new Set();
    recipes.forEach((r) => (r.tags || []).forEach((t) => set.add(t)));
    return [ALL_TAG, ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const q = normalizeText(query);
    return recipes
      .filter((r) => (selectedTag === ALL_TAG ? true : (r.tags || []).includes(selectedTag)))
      .filter((r) => (q ? r._searchIndex.includes(q) : true))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [recipes, query, selectedTag]);

  const selectedRecipe = useMemo(() => {
    if (!selectedRecipeId) return null;
    return recipes.find((r) => r.id === selectedRecipeId) || null;
  }, [recipes, selectedRecipeId]);

  // Reset cook mode (and servings override) when switching recipes.
  useEffect(() => {
    setIsCookMode(false);
    setCookStepIndex(0);
    setServingsOverride(null);
  }, [selectedRecipeId]);

  // Clamp step index if instructions length changes.
  useEffect(() => {
    if (!selectedRecipe) return;
    const total = Array.isArray(selectedRecipe.instructions) ? selectedRecipe.instructions.length : 0;
    setCookStepIndex((prev) => Math.max(0, Math.min(prev, Math.max(0, total - 1))));
  }, [selectedRecipe]);

  // Apply theme to document root.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Persist favorites.
  useEffect(() => {
    try {
      localStorage.setItem("recipe_favorites_v1", JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites]);

  // Persist shopping list.
  useEffect(() => {
    try {
      localStorage.setItem(SHOPPING_LIST_STORAGE_KEY, JSON.stringify(shoppingList));
    } catch {
      // ignore
    }
  }, [shoppingList]);

  // Hash change listener.
  useEffect(() => {
    function onHashChange() {
      setSelectedRecipeId(getRecipeIdFromHash());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Focus shopping list input when opening the sheet.
  useEffect(() => {
    if (!isShoppingListOpen) return;
    const id = window.setTimeout(() => shoppingInputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [isShoppingListOpen]);

  // Keyboard shortcut: "/" focuses search.
  useEffect(() => {
    function onKeyDown(e) {
      const isInputLike =
        e.target instanceof HTMLElement &&
        (e.target.tagName === "INPUT" ||
          e.target.tagName === "TEXTAREA" ||
          e.target.getAttribute("contenteditable") === "true");

      if (isInputLike) return;

      // Cooking mode navigation: ArrowLeft/ArrowRight to move steps.
      if (isCookMode && selectedRecipe) {
        const total = Array.isArray(selectedRecipe.instructions) ? selectedRecipe.instructions.length : 0;

        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setCookStepIndex((prev) => Math.max(0, prev - 1));
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          setCookStepIndex((prev) => Math.min(Math.max(0, total - 1), prev + 1));
          return;
        }
      }

      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        // Priority: exit cook mode, then close shopping list, then close details, then clear search.
        if (isCookMode) {
          setIsCookMode(false);
        } else if (isShoppingListOpen) {
          setIsShoppingListOpen(false);
        } else if (selectedRecipeId) {
          navigateHome();
        } else if (query) {
          setQuery("");
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCookMode, isShoppingListOpen, query, selectedRecipe, selectedRecipeId]);

  // PUBLIC_INTERFACE
  function toggleTheme() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }

  function navigateToRecipe(id) {
    window.location.hash = `#/recipe/${encodeURIComponent(id)}`;
  }

  function navigateHome() {
    window.location.hash = "#/";
  }

  function toggleFavorite(recipeId) {
    setFavorites((prev) => {
      const set = new Set(prev);
      if (set.has(recipeId)) set.delete(recipeId);
      else set.add(recipeId);
      return Array.from(set);
    });
  }

  function openShoppingList() {
    setIsShoppingListOpen(true);
  }

  function closeShoppingList() {
    setIsShoppingListOpen(false);
  }

  function openCookMode() {
    setCookStepIndex(0);
    setIsCookMode(true);
  }

  function closeCookMode() {
    setIsCookMode(false);
  }

  function goCookPrev(totalSteps) {
    setCookStepIndex((prev) => Math.max(0, prev - 1));
  }

  function goCookNext(totalSteps) {
    setCookStepIndex((prev) => Math.min(Math.max(0, totalSteps - 1), prev + 1));
  }

  // PUBLIC_INTERFACE
  function addItemsToShoppingList(items) {
    /**
     * Items can be:
     * - string ingredient lines
     * - objects { text }
     *
     * We merge on a simplified key so repeatedly adding from recipes increases count.
     */
    const normalized = (items || [])
      .map((x) => (typeof x === "string" ? { text: x } : x))
      .map((x) => ({
        text: String(x?.text || "").trim(),
      }))
      .filter((x) => x.text);

    if (normalized.length === 0) return;

    setShoppingList((prev) => {
      const byKey = new Map(prev.map((it) => [it.key, it]));
      const updated = [...prev];

      normalized.forEach(({ text }) => {
        const key = ingredientKey(ingredientDisplayName(text) || text);
        const existing = byKey.get(key);
        if (existing) {
          const next = { ...existing, count: (existing.count || 1) + 1, checked: false };
          byKey.set(key, next);
          const idx = updated.findIndex((u) => u.id === existing.id);
          if (idx >= 0) updated[idx] = next;
        } else {
          const next = {
            id: makeShoppingItemId(),
            text,
            key,
            checked: false,
            count: 1,
            notes: "",
          };
          byKey.set(key, next);
          updated.push(next);
        }
      });

      // Keep unchecked first, then checked (so active tasks stay on top).
      updated.sort((a, b) => Number(a.checked) - Number(b.checked));
      return updated;
    });
  }

  function addSingleShoppingItemFromInput() {
    const text = String(newShoppingText || "").trim();
    if (!text) return;
    addItemsToShoppingList([text]);
    setNewShoppingText("");
  }

  function toggleShoppingItemChecked(itemId) {
    setShoppingList((prev) => {
      const next = prev.map((it) => (it.id === itemId ? { ...it, checked: !it.checked } : it));
      next.sort((a, b) => Number(a.checked) - Number(b.checked));
      return next;
    });
  }

  function removeShoppingItem(itemId) {
    setShoppingList((prev) => prev.filter((it) => it.id !== itemId));
  }

  function updateShoppingItemNotes(itemId, notes) {
    setShoppingList((prev) => prev.map((it) => (it.id === itemId ? { ...it, notes } : it)));
  }

  function decrementShoppingItem(itemId) {
    setShoppingList((prev) =>
      prev.flatMap((it) => {
        if (it.id !== itemId) return [it];
        const count = Math.max(1, Number(it.count || 1));
        if (count <= 1) return [];
        return [{ ...it, count: count - 1 }];
      })
    );
  }

  function clearCheckedItems() {
    setShoppingList((prev) => prev.filter((it) => !it.checked));
  }

  function clearAllItems() {
    setShoppingList([]);
  }

  const favoriteCount = favorites.length;
  const shoppingCount = shoppingList.reduce((acc, it) => acc + (Number(it.count || 1) || 1), 0);
  const shoppingUncheckedCount = shoppingList
    .filter((it) => !it.checked)
    .reduce((acc, it) => acc + (Number(it.count || 1) || 1), 0);

  return (
    <div className="App">
      <header className="TopBar">
        <div className="TopBar__inner">
          <div className="Brand" role="banner" aria-label="Recipe Explorer">
            <div className="Brand__mark" aria-hidden="true">
              🍳
            </div>
            <div className="Brand__text">
              <div className="Brand__title">Recipe Explorer</div>
              <div className="Brand__subtitle">Browse, search, and cook something fun</div>
            </div>
          </div>

          <div className="TopBar__actions">
            <button
              type="button"
              className="Chip"
              title="Shopping list"
              onClick={openShoppingList}
              aria-label={`Open shopping list (${shoppingUncheckedCount} items remaining)`}
            >
              <span aria-hidden="true">🧺</span>
              <span className="Chip__label">Shopping</span>
              <span className="Chip__count" aria-label={`${shoppingCount} items in shopping list`}>
                {shoppingCount}
              </span>
            </button>

            <div className="Chip" title="Favorites">
              <span aria-hidden="true">❤️</span>
              <span className="Chip__label">Favorites</span>
              <span className="Chip__count" aria-label={`${favoriteCount} favorites`}>
                {favoriteCount}
              </span>
            </div>

            <button
              className="Btn Btn--ghost"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              type="button"
            >
              {theme === "light" ? "Dark" : "Light"} mode
            </button>
          </div>
        </div>

        <div className="TopBar__controls">
          <div className="Container">
            <div className="Controls">
              <div className="Search">
                <label className="SrOnly" htmlFor="recipe-search">
                  Search recipes
                </label>
                <div className="Search__icon" aria-hidden="true">
                  ⌕
                </div>
                <input
                  id="recipe-search"
                  ref={searchInputRef}
                  className="Search__input"
                  placeholder="Search recipes (press / to focus)…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  type="search"
                  autoComplete="off"
                />
                {query ? (
                  <button className="Search__clear" type="button" onClick={() => setQuery("")}>
                    Clear
                  </button>
                ) : (
                  <div className="Search__hint" aria-hidden="true">
                    /
                  </div>
                )}
              </div>

              <div className="Filters" aria-label="Recipe tags">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`TagPill ${selectedTag === tag ? "TagPill--active" : ""}`}
                    onClick={() => setSelectedTag(tag)}
                    aria-pressed={selectedTag === tag}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div className="Controls__meta" aria-live="polite">
                <span className="MetaText">
                  Showing <strong>{filteredRecipes.length}</strong> of <strong>{recipes.length}</strong>
                </span>
                <span className="MetaText MetaText--muted">Esc closes • / focuses search</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="Main" role="main">
        <div className="Container">
          {!selectedRecipe ? (
            <>
              <section className="GridHeader" aria-label="Browse recipes">
                <h1 className="H1">Discover recipes</h1>
                <p className="Lead">
                  Tap a card to see ingredients and step-by-step instructions. Favorites and your shopping list
                  are saved locally.
                </p>
              </section>

              {filteredRecipes.length === 0 ? (
                <div className="EmptyState" role="status">
                  <div className="EmptyState__icon" aria-hidden="true">
                    🧁
                  </div>
                  <div className="EmptyState__title">No recipes found</div>
                  <div className="EmptyState__desc">Try a different search term or switch tags.</div>
                  <button className="Btn" type="button" onClick={() => (setQuery(""), setSelectedTag(ALL_TAG))}>
                    Reset filters
                  </button>
                </div>
              ) : (
                <section className="Grid" aria-label="Recipe results">
                  {filteredRecipes.map((recipe) => {
                    const isFav = favorites.includes(recipe.id);
                    return (
                      <article key={recipe.id} className="Card">
                        <button
                          type="button"
                          className="Card__click"
                          onClick={() => navigateToRecipe(recipe.id)}
                          aria-label={`Open recipe: ${recipe.title}`}
                        >
                          <div className="Card__top">
                            <div className="Card__emoji" aria-hidden="true">
                              {recipe.imageEmoji}
                            </div>
                            <div className="Card__fav" aria-hidden="true">
                              {isFav ? "❤️" : "🤍"}
                            </div>
                          </div>
                          <h2 className="Card__title">{recipe.title}</h2>
                          <p className="Card__desc">{recipe.description}</p>
                          <div className="Card__meta">{formatMeta(recipe)}</div>
                          <div className="Card__tags" aria-label="Tags">
                            {(recipe.tags || []).slice(0, 3).map((t) => (
                              <span key={t} className="Badge">
                                {t}
                              </span>
                            ))}
                          </div>
                        </button>

                        <div className="Card__actions">
                          <button
                            type="button"
                            className={`Btn Btn--small ${isFav ? "Btn--primary" : "Btn--ghost"}`}
                            onClick={() => toggleFavorite(recipe.id)}
                            aria-label={`${isFav ? "Remove from" : "Add to"} favorites`}
                          >
                            {isFav ? "Saved" : "Save"}
                          </button>
                          <button
                            type="button"
                            className="Btn Btn--small Btn--ghost"
                            onClick={() => {
                              addItemsToShoppingList(recipe.ingredients);
                              openShoppingList();
                            }}
                            aria-label="Add ingredients to shopping list"
                          >
                            Add list
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </section>
              )}
            </>
          ) : (
            <section className="Details" aria-label="Recipe details">
              <div className="Details__top">
                <button className="Btn Btn--ghost" type="button" onClick={navigateHome}>
                  ← Back
                </button>

                <div className="Details__spacer" />

                <button
                  className="Btn Btn--ghost"
                  type="button"
                  onClick={() => {
                    addItemsToShoppingList(selectedRecipe.ingredients);
                    openShoppingList();
                  }}
                >
                  🧺 Add to shopping list
                </button>

                <button
                  className={`Btn ${favorites.includes(selectedRecipe.id) ? "Btn--primary" : ""}`}
                  type="button"
                  onClick={() => toggleFavorite(selectedRecipe.id)}
                >
                  {favorites.includes(selectedRecipe.id) ? "❤️ Saved" : "🤍 Save"}
                </button>
              </div>

              <div className="Details__header">
                <div className="Details__emoji" aria-hidden="true">
                  {selectedRecipe.imageEmoji}
                </div>
                <div className="Details__headings">
                  <h1 className="H1">{selectedRecipe.title}</h1>
                  <p className="Lead">{selectedRecipe.description}</p>

                  <div className="Details__facts" aria-label="Recipe facts">
                    <div className="Fact">
                      <div className="Fact__label">Time</div>
                      <div className="Fact__value">{selectedRecipe.timeMinutes} min</div>
                    </div>
                    <div className="Fact">
                      <div className="Fact__label">Servings</div>
                      <div className="Fact__value">{selectedRecipe.servings}</div>
                    </div>
                    <div className="Fact">
                      <div className="Fact__label">Difficulty</div>
                      <div className="Fact__value">{selectedRecipe.difficulty}</div>
                    </div>
                    <div className="Fact">
                      <div className="Fact__label">Calories</div>
                      <div className="Fact__value">{selectedRecipe.calories}</div>
                    </div>
                  </div>

                  <div className="Details__tagRow" aria-label="Tags">
                    {(selectedRecipe.tags || []).map((t) => (
                      <span key={t} className="Badge Badge--solid">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="Details__body">
                <div className="Panel">
                  {(() => {
                    const baseServings = clampServings(selectedRecipe.servings || 1);
                    const scaledServings =
                      servingsOverride == null ? baseServings : clampServings(servingsOverride);
                    const scale = baseServings > 0 ? scaledServings / baseServings : 1;

                    const scaledIngredients = (selectedRecipe.ingredients || []).map((line) =>
                      scaleIngredientLine(line, scale)
                    );

                    return (
                      <>
                        <div className="Panel__head">
                          <div className="Panel__headLeft">
                            <h2 className="H2">Ingredients</h2>

                            <div className="Servings" aria-label="Adjust servings">
                              <span className="Servings__label">Servings</span>
                              <div className="Servings__stepper" role="group" aria-label="Servings controls">
                                <button
                                  className="Btn Btn--small Btn--ghost"
                                  type="button"
                                  onClick={() =>
                                    setServingsOverride((prev) =>
                                      clampServings((prev == null ? baseServings : prev) - 1)
                                    )
                                  }
                                  disabled={scaledServings <= 1}
                                  aria-label="Decrease servings"
                                >
                                  −
                                </button>
                                <output className="Servings__value" aria-live="polite">
                                  {scaledServings}
                                </output>
                                <button
                                  className="Btn Btn--small Btn--ghost"
                                  type="button"
                                  onClick={() =>
                                    setServingsOverride((prev) =>
                                      clampServings((prev == null ? baseServings : prev) + 1)
                                    )
                                  }
                                  aria-label="Increase servings"
                                >
                                  +
                                </button>

                                {scaledServings !== baseServings ? (
                                  <button
                                    className="Btn Btn--small Btn--ghost"
                                    type="button"
                                    onClick={() => setServingsOverride(null)}
                                    aria-label={`Reset servings to ${baseServings}`}
                                    title={`Reset to ${baseServings}`}
                                  >
                                    Reset
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <button
                            className="Btn Btn--small Btn--ghost"
                            type="button"
                            onClick={() => {
                              // Keep shopping list behavior unchanged: add the original ingredient lines.
                              addItemsToShoppingList(selectedRecipe.ingredients);
                              openShoppingList();
                            }}
                          >
                            Add all
                          </button>
                        </div>

                        <ul className="List">
                          {scaledIngredients.map((scaledLine, idx) => {
                            const originalLine = selectedRecipe.ingredients[idx];
                            return (
                              <li key={`${selectedRecipe.id}-ing-${idx}`} className="List__item">
                                <span className="List__bullet" aria-hidden="true">
                                  •
                                </span>
                                <span className="List__text">{scaledLine}</span>
                                <button
                                  className="Btn Btn--small Btn--ghost"
                                  type="button"
                                  onClick={() => addItemsToShoppingList([originalLine])}
                                  aria-label={`Add to shopping list: ${originalLine}`}
                                >
                                  + List
                                </button>
                              </li>
                            );
                          })}
                        </ul>

                        {scaledServings !== baseServings ? (
                          <div className="MetaText MetaText--muted" style={{ marginTop: 10 }}>
                            Scaled from <strong>{baseServings}</strong> to <strong>{scaledServings}</strong> servings.
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                </div>

                <div className="Panel">
                  <div className="Panel__head">
                    <h2 className="H2">Instructions</h2>
                    {!isCookMode ? (
                      <button className="Btn Btn--small Btn--primary" type="button" onClick={openCookMode}>
                        Start cook mode
                      </button>
                    ) : (
                      <button className="Btn Btn--small Btn--ghost" type="button" onClick={closeCookMode}>
                        Exit cook mode
                      </button>
                    )}
                  </div>

                  {!isCookMode ? (
                    <ol className="Steps" aria-label="All instruction steps">
                      {selectedRecipe.instructions.map((step, idx) => (
                        <li key={`${selectedRecipe.id}-step-${idx}`} className="Steps__item">
                          <div className="Steps__num" aria-hidden="true">
                            {idx + 1}
                          </div>
                          <div className="Steps__text">{step}</div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    (() => {
                      const total = selectedRecipe.instructions.length;
                      const stepText = selectedRecipe.instructions[cookStepIndex] || "";
                      const isFirst = cookStepIndex <= 0;
                      const isLast = cookStepIndex >= total - 1;

                      return (
                        <div className="Cook" role="region" aria-label="Cooking mode step-by-step">
                          <div className="Cook__progress" aria-label={`Step ${cookStepIndex + 1} of ${total}`}>
                            <div className="Cook__stepNum">
                              Step <strong>{cookStepIndex + 1}</strong> of <strong>{total}</strong>
                            </div>
                            <div className="Cook__bar" aria-hidden="true">
                              <div
                                className="Cook__barFill"
                                style={{
                                  width: `${total > 0 ? Math.round(((cookStepIndex + 1) / total) * 100) : 0}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div className="Cook__card" aria-live="polite">
                            <div className="Cook__cardNum" aria-hidden="true">
                              {cookStepIndex + 1}
                            </div>
                            <div className="Cook__cardText">{stepText}</div>
                          </div>

                          <div className="Cook__actions" aria-label="Step navigation">
                            <button
                              className="Btn Btn--ghost"
                              type="button"
                              onClick={() => goCookPrev(total)}
                              disabled={isFirst}
                            >
                              ← Previous
                            </button>
                            <button
                              className={`Btn ${isLast ? "Btn--primary" : "Btn--ghost"}`}
                              type="button"
                              onClick={() => goCookNext(total)}
                              disabled={isLast}
                            >
                              Next →
                            </button>
                          </div>

                          <div className="Cook__hint MetaText MetaText--muted">
                            Tip: use <strong>←</strong>/<strong>→</strong> to navigate • <strong>Esc</strong> to exit
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>

                <div className="Panel Panel--note" role="note" aria-label="Tip">
                  <div className="Panel__noteTitle">Tip</div>
                  <div className="Panel__noteText">
                    Press <strong>Esc</strong> to {isCookMode ? "exit cook mode" : "go back (or close the shopping list)"}.
                    Press <strong>/</strong> to jump to search.
                    {isCookMode ? (
                      <>
                        {" "}
                        Use <strong>←</strong>/<strong>→</strong> to move between steps.
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Shopping list sheet (modal) */}
      {isShoppingListOpen ? (
        <div
          className="Modal"
          role="dialog"
          aria-modal="true"
          aria-label="Shopping list"
          onMouseDown={(e) => {
            // Click outside sheet closes.
            if (e.target === e.currentTarget) closeShoppingList();
          }}
        >
          <div className="Sheet">
            <div className="Sheet__header">
              <div className="Sheet__titleRow">
                <div>
                  <div className="Sheet__title">Shopping list</div>
                  <div className="Sheet__subtitle">
                    {shoppingUncheckedCount} remaining • {shoppingCount} total (counts included)
                  </div>
                </div>
                <button className="Btn Btn--ghost" type="button" onClick={closeShoppingList} aria-label="Close">
                  ✕
                </button>
              </div>

              <div className="Sheet__composer" aria-label="Add a shopping item">
                <label className="SrOnly" htmlFor="shopping-add">
                  Add item
                </label>
                <input
                  id="shopping-add"
                  ref={shoppingInputRef}
                  className="TextInput"
                  value={newShoppingText}
                  placeholder="Add an item (e.g., milk, 2 limes)…"
                  onChange={(e) => setNewShoppingText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addSingleShoppingItemFromInput();
                  }}
                />
                <button
                  className="Btn Btn--primary"
                  type="button"
                  onClick={addSingleShoppingItemFromInput}
                  disabled={!String(newShoppingText || "").trim()}
                >
                  Add
                </button>
              </div>

              <div className="Sheet__actions">
                <button className="Btn Btn--small Btn--ghost" type="button" onClick={clearCheckedItems} disabled={!shoppingList.some((i) => i.checked)}>
                  Clear checked
                </button>
                <button className="Btn Btn--small Btn--ghost" type="button" onClick={clearAllItems} disabled={shoppingList.length === 0}>
                  Clear all
                </button>
              </div>
            </div>

            <div className="Sheet__body">
              {shoppingList.length === 0 ? (
                <div className="EmptyState" role="status">
                  <div className="EmptyState__icon" aria-hidden="true">
                    🧺
                  </div>
                  <div className="EmptyState__title">Your list is empty</div>
                  <div className="EmptyState__desc">Add items here, or add ingredients from any recipe.</div>
                </div>
              ) : (
                <ul className="ShopList" aria-label="Shopping list items">
                  {shoppingList.map((item) => (
                    <li key={item.id} className={`ShopItem ${item.checked ? "ShopItem--checked" : ""}`}>
                      <label className="ShopItem__main">
                        <input
                          type="checkbox"
                          checked={!!item.checked}
                          onChange={() => toggleShoppingItemChecked(item.id)}
                          aria-label={`Mark as ${item.checked ? "not purchased" : "purchased"}: ${item.text}`}
                        />
                        <div className="ShopItem__text">
                          <div className="ShopItem__line">
                            <span className="ShopItem__name">{item.text}</span>
                            <span className="ShopItem__count" aria-label={`Count ${item.count || 1}`}>
                              ×{item.count || 1}
                            </span>
                          </div>
                          <input
                            className="ShopItem__notes"
                            value={item.notes || ""}
                            placeholder="Notes (brand, size, etc.)"
                            onChange={(e) => updateShoppingItemNotes(item.id, e.target.value)}
                            aria-label={`Notes for ${item.text}`}
                          />
                        </div>
                      </label>

                      <div className="ShopItem__controls" aria-label="Item actions">
                        <button
                          className="Btn Btn--small Btn--ghost"
                          type="button"
                          onClick={() => decrementShoppingItem(item.id)}
                          aria-label="Decrease count"
                          disabled={(item.count || 1) <= 1}
                        >
                          −
                        </button>
                        <button
                          className="Btn Btn--small Btn--ghost"
                          type="button"
                          onClick={() => removeShoppingItem(item.id)}
                          aria-label="Remove item"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="Sheet__footer">
              <div className="MetaText MetaText--muted">Tip: press Esc to close</div>
              <button className="Btn Btn--primary" type="button" onClick={closeShoppingList}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <footer className="Footer">
        <div className="Container Footer__inner">
          <div className="Footer__left">
            <span className="Footer__brand">Rainbow Burst</span>
            <span className="Footer__sep" aria-hidden="true">
              •
            </span>
            <span className="Footer__muted">Frontend-only demo</span>
          </div>
          <div className="Footer__right">
            <a className="Link" href="#/" onClick={(e) => (e.preventDefault(), navigateHome())}>
              Home
            </a>
            <span className="Footer__sep" aria-hidden="true">
              •
            </span>
            <a className="Link" href="https://react.dev" target="_blank" rel="noreferrer" aria-label="React documentation">
              React
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
