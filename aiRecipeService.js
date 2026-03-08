/**
 * AI Recipe Service – runs only in the Electron main process.
 * Loads the OpenAI API key from environment variables and calls the OpenAI API
 * to generate recipe ideas. The API key is never sent to the renderer.
 */

const OpenAI = require('openai').default;

/**
 * Builds an OpenAI client using the API key from environment variables.
 * Call this after dotenv has been loaded (e.g. in main.js).
 */
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('OPENAI_API_KEY is not set in the environment.');
  }
  return new OpenAI({ apiKey });
}

/**
 * Asks OpenAI for 3 dinner recipes for the given category, each with ingredients and instructions.
 * @param {string} category - Food category (e.g. "Italian food", "Mexican")
 * @param {string[]} allergies - Allergens to exclude or substitute (e.g. ["Peanuts", "Dairy"])
 * @param {number} portionSize - Number of servings (e.g. 4 or 8 if making extra for leftovers)
 * @returns {Promise<Array<{ name: string, ingredients: string[], instructions: string[] }>>}
 */
async function generateRecipes(category, allergies = [], portionSize = 4) {
  const client = getOpenAIClient();
  const servings = portionSize && portionSize > 0 ? portionSize : 4;
  let prompt = `Generate 3 dinner recipes for "${category}", each scaled for ${servings} servings. For each recipe return a JSON object with exactly these keys:
- "name": string (recipe title)
- "ingredients": array of strings (e.g. ["2 cups flour", "1 tbsp oil"])
- "instructions": array of strings (step-by-step instructions)

Return a JSON array of 3 such objects. No other text, only the JSON array.`;

  if (allergies && allergies.length > 0) {
    const allergyList = allergies.map((a) => `"${a}"`).join(', ');
    prompt += `

CRITICAL DIETARY RESTRICTION: The user must avoid these allergens: ${allergyList}.
- Either STRICTLY EXCLUDE any recipe that contains these ingredients, OR
- If a recipe would normally use them, provide SUBSTITUTIONS in the ingredients list and instructions (e.g. use plant-based milk instead of dairy, omit nuts, use gluten-free flour).
- Every recipe in your response must be safe for someone with these allergies.`;
  }

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: prompt },
    ],
  });

  const text = completion.choices?.[0]?.message?.content?.trim() || '';
  if (!text) {
    throw new Error('Empty response from OpenAI');
  }

  const parsed = parseRecipeJson(text);
  return parsed.slice(0, 3);
}

/**
 * Parses JSON array of recipes from the model response (may be wrapped in markdown code block).
 */
function parseRecipeJson(text) {
  let jsonStr = text.trim();
  const codeBlock = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    jsonStr = codeBlock[1].trim();
  }
  const firstBracket = jsonStr.indexOf('[');
  const lastBracket = jsonStr.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
  }
  const arr = JSON.parse(jsonStr);
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => ({
    name: typeof item.name === 'string' ? item.name : 'Recipe',
    ingredients: Array.isArray(item.ingredients) ? item.ingredients.map(String) : [],
    instructions: Array.isArray(item.instructions) ? item.instructions.map(String) : [],
  }));
}

module.exports = {
  generateRecipes,
};
