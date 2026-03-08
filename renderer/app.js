// Renderer entry for the Weekly Meal Planner Prototype.
// This file is responsible for:
// - Reading configuration form inputs.
// - Storing the current weekly framework in memory.
// - Rendering a simple 7-day calendar based on user-defined themes.
//
// Future layers (recipe generation, ingredient aggregation, shopping list export)
// can build on top of the `state` object and the render functions defined here.

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const STORAGE_KEY = 'mealPlanner.weeklyState';

/**
 * Minimal state holder for this prototype.
 * Later, additional fields can be added (recipes, ingredients, etc.).
 */
const state = {
  portionSize: 4,
  themes: {
    Monday: '',
    Tuesday: '',
    Wednesday: '',
    Thursday: '',
    Friday: '',
    Saturday: '',
    Sunday: '',
  },
  /** Locked-in recipe per day: { name, ingredients, instructions } or null */
  selectedRecipes: {
    Monday: null,
    Tuesday: null,
    Wednesday: null,
    Thursday: null,
    Friday: null,
    Saturday: null,
    Sunday: null,
  },
  /** Generated grocery list: null or { dayNames: string[], items: { quantity, unit, name }[] } */
  groceryList: null,
  /** Which days are selected for the next grocery list generation (1–7). */
  groceryListDays: new Set(),
  /** 'full' = all ingredients, 'uncommon' = exclude pantry staples */
  groceryListMode: 'full',
};

/** Full recipe objects for the current pick modal (so we can store the one the user selects). */
let currentModalRecipes = [];

/**
 * Loads saved state from localStorage (themes, portion size, selected recipes).
 * Merges into state; does nothing if no saved data or parse error.
 */
function loadStateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.portionSize != null && Number(saved.portionSize) > 0) {
      state.portionSize = Number(saved.portionSize);
    }
    if (saved.themes && typeof saved.themes === 'object') {
      DAYS_OF_WEEK.forEach((day) => {
        if (saved.themes[day] != null) state.themes[day] = String(saved.themes[day]);
      });
    }
    if (saved.selectedRecipes && typeof saved.selectedRecipes === 'object') {
      DAYS_OF_WEEK.forEach((day) => {
        const r = saved.selectedRecipes[day];
        if (r == null) {
          state.selectedRecipes[day] = null;
        } else if (r && typeof r.name === 'string') {
          state.selectedRecipes[day] = {
            name: r.name,
            ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(String) : [],
            instructions: Array.isArray(r.instructions) ? r.instructions.map(String) : [],
          };
        }
      });
    }
    if (saved.groceryList && saved.groceryList.dayNames && Array.isArray(saved.groceryList.items)) {
      state.groceryList = {
        dayNames: saved.groceryList.dayNames.slice(),
        items: saved.groceryList.items.map((it) => ({
          quantity: it.quantity,
          unit: typeof it.unit === 'string' ? it.unit : '',
          name: typeof it.name === 'string' ? it.name : '',
        })),
      };
    }
    if (saved.groceryListMode === 'uncommon' || saved.groceryListMode === 'full') {
      state.groceryListMode = saved.groceryListMode;
    }
  } catch (e) {
    console.warn('Could not load saved meal planner state:', e);
  }
}

/**
 * Saves current state (themes, portion size, selected recipes) to localStorage.
 */
function saveStateToStorage() {
  try {
    const payload = {
      portionSize: state.portionSize,
      themes: { ...state.themes },
      selectedRecipes: { ...state.selectedRecipes },
      groceryList: state.groceryList,
      groceryListMode: state.groceryListMode,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('Could not save meal planner state:', e);
  }
}

/**
 * Writes state back to the form inputs (e.g. after loading from localStorage).
 */
function syncStateToForm() {
  const portionInput = document.getElementById('portion-size');
  if (portionInput) portionInput.value = String(state.portionSize);
  const themeIds = {
    Monday: 'theme-monday',
    Tuesday: 'theme-tuesday',
    Wednesday: 'theme-wednesday',
    Thursday: 'theme-thursday',
    Friday: 'theme-friday',
    Saturday: 'theme-saturday',
    Sunday: 'theme-sunday',
  };
  DAYS_OF_WEEK.forEach((day) => {
    const input = document.getElementById(themeIds[day]);
    if (input) input.value = state.themes[day] || '';
  });
}

const COMMON_UNITS = new Set(['cup', 'cups', 'tbsp', 'tb', 'tsp', 'ts', 'lb', 'lbs', 'oz', 'g', 'kg', 'ml', 'l', 'clove', 'cloves', 'can', 'cans', 'bunch', 'pinch', 'slice', 'slices', 'stalk', 'stalks', 'piece', 'pieces', 'large', 'small', 'medium']);

/** Pantry staples to exclude when "uncommon ingredients only" is selected. */
const PANTRY_STAPLES = [
  'flour', 'sugar', 'salt', 'black pepper', 'ground pepper', 'white pepper', 'garlic powder',
  'onion powder', 'paprika', 'cumin', 'oregano', 'basil', 'thyme', 'cinnamon', 'nutmeg',
  'vanilla extract', 'baking powder', 'baking soda', 'olive oil', 'vegetable oil', 'canola oil',
  'butter', 'vinegar', 'soy sauce', 'ketchup', 'mustard', 'honey', 'maple syrup', 'cornstarch',
  'water', 'cooking spray', 'bay leaf', 'bay leaves', 'red pepper flakes', 'worcestershire',
  'hot sauce', 'sriracha', 'mayonnaise', 'breadcrumbs', 'rice', 'pasta', 'tomato paste',
  'chicken broth', 'beef broth', 'stock',
];

function isPantryStaple(ingredientName) {
  const lower = (ingredientName || '').toLowerCase();
  return PANTRY_STAPLES.some((staple) => lower.includes(staple));
}

/** Formats day names for display: "Monday – Wednesday" for consecutive, or "Monday, Wednesday, Friday". */
function formatDayRange(dayNames) {
  if (!dayNames || dayNames.length === 0) return '';
  const indices = dayNames.map((d) => DAYS_OF_WEEK.indexOf(d)).filter((i) => i >= 0).sort((a, b) => a - b);
  if (indices.length === 0) return '';
  const ordered = indices.map((i) => DAYS_OF_WEEK[i]);
  const ranges = [];
  let start = ordered[0];
  let end = ordered[0];
  for (let i = 1; i < ordered.length; i++) {
    const curr = ordered[i];
    const prevIdx = DAYS_OF_WEEK.indexOf(ordered[i - 1]);
    if (DAYS_OF_WEEK.indexOf(curr) === prevIdx + 1) {
      end = curr;
    } else {
      ranges.push(start === end ? start : `${start} – ${end}`);
      start = end = curr;
    }
  }
  ranges.push(start === end ? start : `${start} – ${end}`);
  return ranges.join(', ');
}

function parseIngredientLine(line) {
  const trimmed = (line || '').trim();
  if (!trimmed) return null;
  const withNumber = trimmed.match(/^([\d./]+)\s+(\S+)(?:\s+(.+))?$/);
  if (withNumber) {
    const numStr = withNumber[1];
    const second = withNumber[2] || '';
    const rest = (withNumber[3] || '').trim();
    let quantity = parseFloat(numStr);
    if (numStr.includes('/')) {
      const [a, b] = numStr.split('/').map((s) => parseFloat(s.trim()));
      if (!Number.isNaN(a) && !Number.isNaN(b) && b !== 0) quantity = a / b;
    }
    if (Number.isNaN(quantity)) quantity = 0;
    const unitLower = second.toLowerCase();
    if (COMMON_UNITS.has(unitLower) || second.length <= 3) {
      const name = rest || second;
      return { quantity, unit: second, name: name || trimmed };
    }
    return { quantity, unit: '', name: second + (rest ? ' ' + rest : '') };
  }
  return { quantity: 1, unit: '', name: trimmed };
}

function aggregateIngredients(parsedList) {
  const map = new Map();
  for (const it of parsedList) {
    if (!it || !it.name) continue;
    const key = `${(it.name || '').trim().toLowerCase()}|${(it.unit || '').trim().toLowerCase()}`;
    const existing = map.get(key);
    const q = typeof it.quantity === 'number' && !Number.isNaN(it.quantity) ? it.quantity : 0;
    if (existing) {
      existing.quantity += q;
    } else {
      map.set(key, {
        quantity: q,
        unit: it.unit || '',
        name: (it.name || '').trim(),
      });
    }
  }
  const items = Array.from(map.values());
  items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return items;
}

function generateGroceryList() {
  const dayNames = Array.from(state.groceryListDays).filter((d) => DAYS_OF_WEEK.includes(d));
  if (dayNames.length === 0 || dayNames.length > 7) return false;
  const allLines = [];
  dayNames.forEach((day) => {
    const recipe = state.selectedRecipes[day];
    if (recipe && Array.isArray(recipe.ingredients)) {
      recipe.ingredients.forEach((line) => allLines.push(line));
    }
  });
  const parsed = allLines.map(parseIngredientLine).filter(Boolean);
  let items = aggregateIngredients(parsed);
  if (state.groceryListMode === 'uncommon') {
    items = items.filter((it) => !isPantryStaple(it.name));
  }
  state.groceryList = { dayNames, items };
  saveStateToStorage();
  return true;
}

function openGroceryListModal() {
  const modal = document.getElementById('grocery-list-modal');
  const titleEl = document.getElementById('grocery-list-modal-title');
  const listEl = document.getElementById('grocery-list-items');
  const emptyEl = document.getElementById('grocery-list-empty');
  const copyBtn = document.getElementById('grocery-list-copy');
  const clearBtn = document.getElementById('grocery-list-clear');
  if (!modal) return;

  if (titleEl && state.groceryList && state.groceryList.dayNames) {
    titleEl.textContent = `Grocery List (${formatDayRange(state.groceryList.dayNames)})`;
  }

  if (state.groceryList && state.groceryList.items.length > 0) {
    if (listEl) {
      listEl.innerHTML = '';
      listEl.hidden = false;
      state.groceryList.items.forEach((it) => {
        const li = document.createElement('li');
        const q = typeof it.quantity === 'number' && it.quantity > 0 ? it.quantity : '';
        const u = (it.unit || '').trim();
        li.textContent = [q, u, it.name].filter(Boolean).join(' ');
        listEl.appendChild(li);
      });
    }
    if (emptyEl) emptyEl.hidden = true;
    if (copyBtn) copyBtn.disabled = false;
    if (clearBtn) clearBtn.disabled = false;
  } else {
    if (listEl) listEl.hidden = true;
    if (emptyEl) {
      emptyEl.hidden = false;
      emptyEl.textContent = state.groceryList && state.groceryList.dayNames && state.groceryList.dayNames.length > 0
        ? 'No ingredients found for the selected days.'
        : 'No list generated yet. Select days and click Generate grocery list.';
    }
    if (copyBtn) copyBtn.disabled = true;
    if (clearBtn) clearBtn.disabled = state.groceryList == null;
  }
  modal.classList.add('recipe-modal-open');
}

function closeGroceryListModal() {
  const modal = document.getElementById('grocery-list-modal');
  if (modal) modal.classList.remove('recipe-modal-open');
}

function copyGroceryListToClipboard() {
  if (!state.groceryList || !state.groceryList.items.length) return;
  const lines = state.groceryList.items.map((it) => {
    const q = typeof it.quantity === 'number' && it.quantity > 0 ? it.quantity : '';
    const u = (it.unit || '').trim();
    return [q, u, it.name].filter(Boolean).join(' ');
  });
  const text = lines.join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

function clearGroceryList() {
  state.groceryList = null;
  saveStateToStorage();
  closeGroceryListModal();
  updateGroceryListButtons();
}

function updateGroceryListButtons() {
  const count = state.groceryListDays.size;
  const generateBtn = document.getElementById('grocery-generate-btn');
  if (generateBtn) generateBtn.disabled = count < 1 || count > 7;
  renderGroceryListLinks();
}

/**
 * Renders the clickable link "Grocery List Monday – Wednesday" when a list exists.
 */
function renderGroceryListLinks() {
  const container = document.getElementById('grocery-list-links');
  if (!container) return;
  container.innerHTML = '';
  if (state.groceryList && state.groceryList.dayNames && state.groceryList.dayNames.length > 0) {
    const label = formatDayRange(state.groceryList.dayNames);
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'grocery-list-link';
    link.textContent = `Grocery List ${label}`;
    link.addEventListener('click', openGroceryListModal);
    container.appendChild(link);
  }
}

function toggleGroceryDay(dayName) {
  if (state.groceryListDays.has(dayName)) {
    state.groceryListDays.delete(dayName);
  } else {
    if (state.groceryListDays.size >= 7) {
      const cb = document.getElementById(`grocery-day-${dayName.toLowerCase()}`);
      if (cb) cb.checked = false;
      updateGroceryListButtons();
      return;
    }
    state.groceryListDays.add(dayName);
  }
  const cb = document.getElementById(`grocery-day-${dayName.toLowerCase()}`);
  if (cb) cb.checked = state.groceryListDays.has(dayName);
  updateGroceryListButtons();
}

/**
 * Renders the row of day checkboxes for grocery list selection.
 */
function renderGroceryDaysRow() {
  const row = document.getElementById('grocery-days-row');
  if (!row) return;
  row.innerHTML = '';
  const short = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  DAYS_OF_WEEK.forEach((dayName, i) => {
    const label = document.createElement('label');
    label.className = 'grocery-day-label';
    const id = `grocery-day-${dayName.toLowerCase()}`;
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = id;
    cb.className = 'grocery-day-cb';
    cb.dataset.day = dayName;
    cb.checked = state.groceryListDays.has(dayName);
    cb.addEventListener('change', () => toggleGroceryDay(dayName));
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + short[i]));
    row.appendChild(label);
  });
}

/**
 * Reads the configuration form inputs and updates in-memory state.
 * This keeps all planner data in one place for future expansion.
 */
function readFormIntoState() {
  const portionInput = document.getElementById('portion-size');
  const portionValue = parseInt(portionInput.value, 10);
  state.portionSize = Number.isNaN(portionValue) || portionValue <= 0 ? 1 : portionValue;

  const themeInputs = {
    Monday: document.getElementById('theme-monday'),
    Tuesday: document.getElementById('theme-tuesday'),
    Wednesday: document.getElementById('theme-wednesday'),
    Thursday: document.getElementById('theme-thursday'),
    Friday: document.getElementById('theme-friday'),
    Saturday: document.getElementById('theme-saturday'),
    Sunday: document.getElementById('theme-sunday'),
  };

  DAYS_OF_WEEK.forEach((dayName) => {
    const input = themeInputs[dayName];
    state.themes[dayName] = input ? input.value.trim() : '';
  });
}

/**
 * Renders a simple weekly calendar grid based on the current state.
 * Each column corresponds to a weekday and shows the chosen theme.
 * Cells are clickable: no recipe → pick modal; has recipe → detail modal.
 */
function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;

  grid.innerHTML = '';

  DAYS_OF_WEEK.forEach((dayName) => {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell calendar-cell-clickable';
    cell.dataset.day = dayName;

    const dayLabel = document.createElement('div');
    dayLabel.className = 'calendar-day-label';
    dayLabel.textContent = dayName;

    const themeLabel = document.createElement('div');
    themeLabel.className = 'calendar-theme-label';
    const theme = state.themes[dayName];
    themeLabel.textContent = theme ? `Theme: ${theme}` : 'Theme: (none)';

    cell.appendChild(dayLabel);
    cell.appendChild(themeLabel);
    grid.appendChild(cell);
  });
}

/**
 * Renders the row below the calendar: one cell per day showing the selected recipe name (or blank).
 * Clicking a cell opens the pick modal (no recipe) or detail modal (has recipe).
 */
function renderSelectedRecipesRow() {
  const grid = document.getElementById('selected-recipes-grid');
  if (!grid) return;

  grid.innerHTML = '';

  DAYS_OF_WEEK.forEach((dayName) => {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell calendar-cell-clickable selected-recipe-cell';
    cell.dataset.day = dayName;

    const recipe = state.selectedRecipes[dayName];
    const label = document.createElement('div');
    label.className = 'selected-recipe-label';
    label.textContent = recipe ? recipe.name : '—';
    const sub = document.createElement('div');
    sub.className = 'calendar-theme-label';
    sub.textContent = recipe ? 'Click to view details' : 'No recipe selected';

    cell.appendChild(label);
    cell.appendChild(sub);
    grid.appendChild(cell);
  });
}

/**
 * Returns true if every day of the week has a non-empty theme in state.
 */
function allThemesFilled() {
  return DAYS_OF_WEEK.every((day) => (state.themes[day] || '').trim() !== '');
}

/** Emojis used for each recipe line in the pick modal (rotates if more than 3). */
const RECIPE_EMOJIS = ['🍝', '🥗', '🍕'];

/**
 * Opens the recipe modal for a day. If that day already has a selected recipe, shows
 * the detail view (ingredients + instructions). Otherwise shows the pick view (3 options).
 */
function openRecipeModal(dayName) {
  readFormIntoState();

  if (!allThemesFilled()) {
    alert('Please fill in a theme for every day of the week and click "Generate Weekly Framework" first.');
    return;
  }

  if (state.selectedRecipes[dayName]) {
    openRecipeDetailView(dayName);
  } else {
    openRecipePicker(dayName);
  }
}

/**
 * Opens the modal in detail view: ingredients and instructions for the locked-in recipe.
 */
function openRecipeDetailView(dayName) {
  const recipe = state.selectedRecipes[dayName];
  if (!recipe) return;

  const modal = document.getElementById('recipe-modal');
  const titleEl = document.getElementById('recipe-modal-title');
  const pickView = document.getElementById('recipe-modal-pick-view');
  const detailView = document.getElementById('recipe-modal-detail-view');
  const actionsPick = document.getElementById('recipe-modal-actions-pick');
  const actionsDetail = document.getElementById('recipe-modal-actions-detail');
  const ingredientsEl = document.getElementById('recipe-modal-ingredients');
  const instructionsEl = document.getElementById('recipe-modal-instructions');

  if (!modal || !titleEl || !detailView || !ingredientsEl || !instructionsEl) return;

  modal.dataset.day = dayName;
  titleEl.textContent = recipe.name;

  ingredientsEl.innerHTML = '';
  (recipe.ingredients || []).forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    ingredientsEl.appendChild(li);
  });

  instructionsEl.innerHTML = '';
  (recipe.instructions || []).forEach((step) => {
    const li = document.createElement('li');
    li.textContent = step;
    instructionsEl.appendChild(li);
  });

  pickView.hidden = true;
  detailView.hidden = false;
  if (actionsPick) actionsPick.hidden = true;
  if (actionsDetail) actionsDetail.hidden = false;
  modal.classList.add('recipe-modal-open');
}

/**
 * Opens the modal in pick view: fetches 3 AI recipes and lets the user select one to lock in.
 */
async function openRecipePicker(dayName) {
  const category = (state.themes[dayName] || '').trim();
  const modal = document.getElementById('recipe-modal');
  const titleEl = document.getElementById('recipe-modal-title');
  const pickView = document.getElementById('recipe-modal-pick-view');
  const detailView = document.getElementById('recipe-modal-detail-view');
  const actionsPick = document.getElementById('recipe-modal-actions-pick');
  const actionsDetail = document.getElementById('recipe-modal-actions-detail');
  const loadingEl = document.getElementById('recipe-modal-loading');
  const errorEl = document.getElementById('recipe-modal-error');
  const listEl = document.getElementById('recipe-modal-list');

  if (!modal || !titleEl || !loadingEl || !errorEl || !listEl) return;

  titleEl.textContent = `${dayName.toUpperCase()} – ${(category || '(no category)').toUpperCase()}`;
  modal.dataset.day = dayName;
  modal.dataset.category = category;

  pickView.hidden = false;
  detailView.hidden = true;
  if (actionsPick) actionsPick.hidden = false;
  if (actionsDetail) actionsDetail.hidden = true;

  loadingEl.hidden = false;
  errorEl.hidden = true;
  listEl.hidden = true;
  modal.classList.add('recipe-modal-open');

  const result = await (window.mealAPI && typeof window.mealAPI.generateRecipes === 'function'
    ? window.mealAPI.generateRecipes(category)
    : Promise.resolve({ ok: false, error: 'API not available' }));

  if (result.ok && Array.isArray(result.recipes) && result.recipes.length > 0) {
    currentModalRecipes = result.recipes;
    showModalRecipesSelectable(listEl, result.recipes, dayName);
    hideModalLoading(loadingEl, errorEl, listEl);
  } else {
    showModalError(loadingEl, errorEl, listEl);
  }
}

/**
 * Shows loading state in the modal body (only the loading message visible).
 */
function showModalLoading(loadingEl, errorEl, listEl) {
  if (loadingEl) loadingEl.hidden = false;
  if (errorEl) errorEl.hidden = true;
  if (listEl) listEl.hidden = true;
}

/**
 * Hides loading and shows the recipe list.
 */
function hideModalLoading(loadingEl, errorEl, listEl) {
  if (loadingEl) loadingEl.hidden = true;
  if (errorEl) errorEl.hidden = true;
  if (listEl) listEl.hidden = false;
}

/**
 * Shows error state in the modal body.
 */
function showModalError(loadingEl, errorEl, listEl) {
  if (loadingEl) loadingEl.hidden = true;
  if (errorEl) errorEl.hidden = false;
  if (listEl) listEl.hidden = true;
}

/**
 * Renders the recipe list as clickable options. Each item has data-recipe-index.
 * Clicking one locks that recipe in for the day and closes the modal.
 */
function showModalRecipesSelectable(listEl, recipes, dayName) {
  if (!listEl) return;
  listEl.innerHTML = '';
  recipes.forEach((recipe, i) => {
    const li = document.createElement('li');
    li.className = 'recipe-modal-list-item';
    li.dataset.recipeIndex = String(i);
    const emoji = RECIPE_EMOJIS[i % RECIPE_EMOJIS.length];
    const name = typeof recipe === 'object' && recipe && recipe.name ? recipe.name : String(recipe);
    li.textContent = `${emoji} ${name}`;
    li.title = 'Click to select this recipe for ' + dayName;
    listEl.appendChild(li);
  });
}

/**
 * Refreshes the recipe list in the open modal with new AI-generated recipes (Roll Again).
 */
async function rollAgainInModal() {
  const modal = document.getElementById('recipe-modal');
  if (!modal || !modal.classList.contains('recipe-modal-open')) return;
  const dayName = modal.dataset.day;
  const category = (modal.dataset.category || '').trim();

  const loadingEl = document.getElementById('recipe-modal-loading');
  const errorEl = document.getElementById('recipe-modal-error');
  const listEl = document.getElementById('recipe-modal-list');
  if (!loadingEl || !errorEl || !listEl || !dayName) return;

  showModalLoading(loadingEl, errorEl, listEl);

  const result = await (window.mealAPI && typeof window.mealAPI.generateRecipes === 'function'
    ? window.mealAPI.generateRecipes(category)
    : Promise.resolve({ ok: false, error: 'API not available' }));

  if (result.ok && Array.isArray(result.recipes) && result.recipes.length > 0) {
    currentModalRecipes = result.recipes;
    showModalRecipesSelectable(listEl, result.recipes, dayName);
    hideModalLoading(loadingEl, errorEl, listEl);
  } else {
    showModalError(loadingEl, errorEl, listEl);
  }
}

/**
 * When user clicks one of the 3 recipe options, lock it in for that day and close the modal.
 */
function selectRecipeForDay(dayName, recipeIndex) {
  const recipe = currentModalRecipes[recipeIndex];
  if (!recipe || typeof recipe !== 'object') return;
  state.selectedRecipes[dayName] = {
    name: recipe.name || 'Recipe',
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.slice() : [],
    instructions: Array.isArray(recipe.instructions) ? recipe.instructions.slice() : [],
  };
  closeRecipeModal();
  renderSelectedRecipesRow();
  saveStateToStorage();
}

/**
 * Closes the recipe modal.
 */
function closeRecipeModal() {
  const modal = document.getElementById('recipe-modal');
  if (modal) modal.classList.remove('recipe-modal-open');
}

/**
 * Re-opens the pick view for the current day (e.g. after "Pick different recipe").
 */
function openRecipePickerFromDetail() {
  const modal = document.getElementById('recipe-modal');
  const dayName = modal?.dataset.day;
  if (dayName) openRecipePicker(dayName);
}

/**
 * Sets up DOM event handlers for the configuration UI and recipe modal.
 */
function attachEventHandlers() {
  const generateButton = document.getElementById('generate-btn');
  if (generateButton) {
    generateButton.addEventListener('click', () => {
      readFormIntoState();
      renderCalendar();
      renderSelectedRecipesRow();
      saveStateToStorage();
    });
  }

  // Click on a calendar day cell -> open recipe modal (pick or detail depending on whether day has a recipe)
  const grid = document.getElementById('calendar-grid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      const cell = e.target.closest('.calendar-cell-clickable');
      if (!cell || !cell.dataset.day) return;
      openRecipeModal(cell.dataset.day);
    });
  }

  // Click on the selected-recipe cell for a day -> same as clicking the day (pick or detail)
  const selectedGrid = document.getElementById('selected-recipes-grid');
  if (selectedGrid) {
    selectedGrid.addEventListener('click', (e) => {
      const cell = e.target.closest('.selected-recipe-cell');
      if (!cell || !cell.dataset.day) return;
      openRecipeModal(cell.dataset.day);
    });
  }

  // Modal: close, Roll Again, Pick different recipe, or click a recipe option to select it
  const modal = document.getElementById('recipe-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (
        e.target.id === 'recipe-modal-close' ||
        e.target.id === 'recipe-modal-backdrop' ||
        e.target.id === 'recipe-modal-close-btn' ||
        e.target.id === 'recipe-modal-close-btn-detail'
      ) {
        closeRecipeModal();
      } else if (e.target.id === 'recipe-modal-roll') {
        e.preventDefault();
        rollAgainInModal();
      } else if (e.target.id === 'recipe-modal-pick-different') {
        e.preventDefault();
        openRecipePickerFromDetail();
      } else {
        const listItem = e.target.closest('.recipe-modal-list-item');
        if (listItem && listItem.dataset.recipeIndex != null && modal.dataset.day) {
          e.preventDefault();
          selectRecipeForDay(modal.dataset.day, parseInt(listItem.dataset.recipeIndex, 10));
        }
      }
    });
  }

  // Grocery list: generate, toggle, close, copy, clear
  const groceryGenerateBtn = document.getElementById('grocery-generate-btn');
  if (groceryGenerateBtn) {
    groceryGenerateBtn.addEventListener('click', () => {
      if (generateGroceryList()) {
        openGroceryListModal();
        updateGroceryListButtons();
      }
    });
  }
  const groceryModeToggle = document.getElementById('grocery-mode-uncommon');
  if (groceryModeToggle) {
    groceryModeToggle.checked = state.groceryListMode === 'uncommon';
    groceryModeToggle.addEventListener('change', () => {
      state.groceryListMode = groceryModeToggle.checked ? 'uncommon' : 'full';
      saveStateToStorage();
    });
  }
  document.getElementById('grocery-list-close')?.addEventListener('click', closeGroceryListModal);
  document.getElementById('grocery-list-backdrop')?.addEventListener('click', closeGroceryListModal);
  document.getElementById('grocery-list-copy')?.addEventListener('click', copyGroceryListToClipboard);
  document.getElementById('grocery-list-clear')?.addEventListener('click', clearGroceryList);
}

window.addEventListener('DOMContentLoaded', () => {
  loadStateFromStorage();
  syncStateToForm();
  attachEventHandlers();
  renderCalendar();
  renderSelectedRecipesRow();
  renderGroceryDaysRow();
  updateGroceryListButtons();
});

