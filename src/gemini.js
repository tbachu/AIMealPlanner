const MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

function getApiKey() {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  if (!key || typeof key !== 'string') {
    throw new Error('Missing VITE_GEMINI_API_KEY. Add it to your .env file.')
  }
  return key.trim()
}

function buildPrompt(preferences, menuData) {
  const dietary = preferences?.dietaryRestriction ?? 'none'
  const allergies = preferences?.allergies ?? ''
  const swipes =
    preferences?.swipesRemaining ??
    preferences?.swipes ??
    'Not specified'
  const diningHall = preferences?.diningHall ?? 'chase'
  const menuJson = JSON.stringify(menuData ?? {}, null, 2)

  return `You are a campus dining assistant. Create a 7-day meal plan using ONLY dishes that appear in the menu data below for the user's preferred dining hall.

User constraints:
- Dietary restriction: ${dietary}
- Allergies (avoid any dish that likely contains these): ${allergies || 'none listed'}
- Meal swipes remaining this week (use as a soft budget; do not exceed 21 meals): ${swipes}
- Preferred dining hall (use ONLY this hall's stations for every meal): ${diningHall}

Menu data (JSON, keyed by date YYYY-MM-DD, then dining hall, then meal period with arrays of dish names):
${menuJson}

Rules:
1. Every breakfast, lunch, and dinner value MUST be copied verbatim from the correct date, "${diningHall}", and meal period array in the menu. Do not invent dishes.
2. Sort the date keys in the menu chronologically. Map them in order to Monday, Tuesday, … If there are fewer than 7 dates, repeat the last available day's menu choices for the remaining weekdays, still only using items listed for that date and hall.
3. Respect dietary restriction and allergies when choosing among allowed menu items.
4. Return ONLY valid JSON, no markdown or explanation.

Output shape (all keys lowercase):
{
  "monday": { "breakfast": "...", "lunch": "...", "dinner": "..." },
  "tuesday": { "breakfast": "...", "lunch": "...", "dinner": "..." },
  "wednesday": { "breakfast": "...", "lunch": "...", "dinner": "..." },
  "thursday": { "breakfast": "...", "lunch": "...", "dinner": "..." },
  "friday": { "breakfast": "...", "lunch": "...", "dinner": "..." },
  "saturday": { "breakfast": "...", "lunch": "...", "dinner": "..." },
  "sunday": { "breakfast": "...", "lunch": "...", "dinner": "..." }
}`
}

function normalizeSavedPreferences(preferences) {
  const dietary =
    preferences?.dietaryRestriction === 'vegetarian' ||
    preferences?.dietaryRestriction === 'vegan'
      ? preferences.dietaryRestriction
      : 'none'

  const allergies =
    typeof preferences?.allergies === 'string' ? preferences.allergies.trim() : ''

  const hall =
    typeof preferences?.diningHall === 'string'
      ? preferences.diningHall.toLowerCase()
      : ''
  const diningHall = hall === 'chase' || hall === 'lenoir' ? hall : 'chase'

  return {
    dietaryRestriction: dietary,
    allergies,
    diningHall,
  }
}

function buildChatPrompt(chatHistory, menuData, savedPreferences) {
  const normalizedPreferences = normalizeSavedPreferences(savedPreferences)
  const menuJson = JSON.stringify(menuData ?? {}, null, 2)
  const transcript = Array.isArray(chatHistory)
    ? chatHistory
        .filter((entry) => entry && typeof entry.text === 'string' && entry.text.trim())
        .map((entry) => {
          const role = entry.role === 'assistant' ? 'ASSISTANT' : 'USER'
          return `${role}: ${entry.text.trim()}`
        })
        .join('\n')
    : ''

  return `You are AIMealPlanner's chatbot. Read the conversation and create a 7-day meal plan based on user requests.

Conversation transcript:
${transcript || 'USER: Generate me a balanced weekly meal plan.'}

Saved user preferences (apply by default unless the user explicitly overrides in this conversation):
- Dietary restriction: ${normalizedPreferences.dietaryRestriction}
- Allergies (avoid likely ingredients): ${normalizedPreferences.allergies || 'none listed'}
- Preferred dining hall: ${normalizedPreferences.diningHall}

Menu data (JSON, keyed by date YYYY-MM-DD, then dining hall, then meal period with arrays of dish names):
${menuJson}

Rules:
1. Treat saved user preferences as default constraints for this plan request.
2. If the user explicitly overrides a default in the conversation, honor the explicit user override.
3. Every breakfast, lunch, and dinner value in plan must be copied verbatim from the provided menu data. Do not invent dish names.
4. Sort menu date keys chronologically and map them to Monday, Tuesday, ... in order. If fewer than 7 dates exist, reuse the last available date's meals.
5. Use the preferred dining hall for all meals unless the user explicitly asks for another hall.
6. Return ONLY valid JSON, with no markdown.

Output JSON shape:
{
  "assistantMessage": "short helpful response summarizing assumptions and result",
  "plan": {
    "monday": { "breakfast": "...", "lunch": "...", "dinner": "..." },
    "tuesday": { "breakfast": "...", "lunch": "...", "dinner": "..." },
    "wednesday": { "breakfast": "...", "lunch": "...", "dinner": "..." },
    "thursday": { "breakfast": "...", "lunch": "...", "dinner": "..." },
    "friday": { "breakfast": "...", "lunch": "...", "dinner": "..." },
    "saturday": { "breakfast": "...", "lunch": "...", "dinner": "..." },
    "sunday": { "breakfast": "...", "lunch": "...", "dinner": "..." }
  }
}`
}

function extractTextFromResponse(data) {
  const parts = data?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) {
    throw new Error('Unexpected Gemini response: missing candidates[0].content.parts')
  }
  const text = parts.map((p) => p?.text ?? '').join('')
  if (!text.trim()) {
    throw new Error('Unexpected Gemini response: empty text')
  }
  return text.trim()
}

function parseModelJson(text) {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fence?.[1]) {
      return JSON.parse(fence[1].trim())
    }
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1))
    }
    throw new Error('Could not parse JSON from model response')
  }
}

function parseMaybeJsonString(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  try {
    return parseModelJson(value)
  } catch {
    return null
  }
}

function extractPlanPayload(result) {
  if (!result || typeof result !== 'object') {
    return null
  }

  const directCandidates = [
    result.plan,
    result.weekPlan,
    result.mealPlan,
    result.generatedPlan,
  ]

  for (const candidate of directCandidates) {
    if (candidate && typeof candidate === 'object') {
      return candidate
    }

    const parsedCandidate = parseMaybeJsonString(candidate)
    if (parsedCandidate && typeof parsedCandidate === 'object') {
      return parsedCandidate
    }
  }

  return result
}

async function requestGeminiJson(prompt) {
  const apiKey = getApiKey()

  const response = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: 'application/json',
      },
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const msg =
      data?.error?.message ||
      `Gemini API error: ${response.status} ${response.statusText}`
    throw new Error(msg)
  }

  const text = extractTextFromResponse(data)
  return parseModelJson(text)
}

/**
 * @param {object} preferences - e.g. { dietaryRestriction, allergies, diningHall, swipesRemaining }
 * @param {object} menuData - menu JSON keyed by date, hall, meal
 * @returns {Promise<object>} Parsed 7-day plan: { monday: { breakfast, lunch, dinner }, ... }
 */
export async function generateMealPlan(preferences, menuData) {
  const prompt = buildPrompt(preferences, menuData)
  return requestGeminiJson(prompt)
}

/**
 * @param {Array<{role: 'user'|'assistant', text: string}>} chatHistory
 * @param {object} menuData
 * @param {object} savedPreferences - e.g. { dietaryRestriction, allergies, diningHall }
 * @returns {Promise<{assistantMessage: string, plan: object}>}
 */
export async function generateMealPlanFromChat(
  chatHistory,
  menuData,
  savedPreferences,
) {
  const prompt = buildChatPrompt(chatHistory, menuData, savedPreferences)
  const result = await requestGeminiJson(prompt)

  const assistantMessage =
    typeof result?.assistantMessage === 'string' && result.assistantMessage.trim()
      ? result.assistantMessage.trim()
      : 'I generated a 7-day meal plan from the current menu.'

  const plan = extractPlanPayload(result)
  if (!plan || typeof plan !== 'object') {
    throw new Error('Model response did not include a valid meal plan object.')
  }

  return { assistantMessage, plan }
}
