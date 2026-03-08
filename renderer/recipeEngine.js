/**
 * Recipe engine for the meal planner prototype.
 * Stores a mock recipe database by category and provides random recipe selection.
 * Day constraints (Monday: "Italian", etc.) are held in the renderer state;
 * this module only looks up recipes by category.
 */

// Mock recipe database: category name -> array of recipe names
const recipes = {
  Italian: [
    "Spaghetti Carbonara",
    "Margherita Pizza",
    "Chicken Piccata",
    "Lasagna",
    "Risotto",
    "Fettuccine Alfredo"
  ],
  Mexican: [
    "Tacos",
    "Chicken Enchiladas",
    "Burrito Bowl",
    "Quesadillas",
    "Guacamole Tostadas"
  ],
  Healthy: [
    "Grilled Salmon Salad",
    "Quinoa Bowl",
    "Avocado Chickpea Salad",
    "Roasted Vegetable Plate"
  ],
  "Slow Cooker": [
    "Beef Stew",
    "Pulled Pork",
    "Chicken Tacos",
    "Vegetable Soup",
    "Pot Roast"
  ],
  "Comfort Food": [
    "Mac and Cheese",
    "Shepherd's Pie",
    "Meatloaf",
    "Chicken and Dumplings",
    "Potato Casserole"
  ],
  Grill: [
    "Grilled Chicken",
    "BBQ Ribs",
    "Grilled Salmon",
    "Burgers",
    "Grilled Veggies"
  ],
  Leftovers: [
    "Leftover Bowl",
    "Sandwich Wrap",
    "Soup from Yesterday",
    "Salad with Leftover Protein"
  ]
};

/**
 * Picks up to 3 random recipes for a category (no duplicates).
 * @param {string} category - Category name (e.g. "Italian", "Mexican")
 * @returns {string[]} Array of 0–3 recipe names
 */
function getRandomRecipes(category) {
  const key = (category || "").trim();
  const list = recipes[key];
  if (!list || list.length === 0) {
    return [];
  }
  const shuffled = [...list];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 3);
}

// Expose for use in the renderer (no bundler)
window.RecipeEngine = {
  getRandomRecipes
};
