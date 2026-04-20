import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import useDiningMenuCsv from '../hooks/useDiningMenuCsv'
import { recommendMeals } from '../utils/mealMatcher'

const PREFERENCES_STORAGE_KEY = 'aimealplanner.preferences'
const CHAT_PLANNER_HISTORY_KEY = 'aimealplanner.chatPlanner.history'

const DEFAULT_OLLAMA_MODEL = 'llama3.2:3b'
const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434'

function getOllamaConfig() {
  const rawModel = import.meta.env.VITE_OLLAMA_MODEL
  const rawUrl = import.meta.env.VITE_OLLAMA_URL

  const model =
    typeof rawModel === 'string' && rawModel.trim()
      ? rawModel.trim()
      : DEFAULT_OLLAMA_MODEL

  const baseUrl =
    typeof rawUrl === 'string' && rawUrl.trim()
      ? rawUrl.trim().replace(/\/+$/, '')
      : DEFAULT_OLLAMA_URL

  return { model, baseUrl }
}

function readStoredPreferences() {
  try {
    const item = localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (!item) return { dietaryRestriction: 'none', allergies: '', diningHall: 'all' }
    const parsed = JSON.parse(item)
    return {
      dietaryRestriction: ['none', 'vegetarian', 'vegan'].includes(parsed?.dietaryRestriction)
        ? parsed.dietaryRestriction
        : 'none',
      allergies: typeof parsed?.allergies === 'string' ? parsed.allergies : '',
      diningHall: parsed?.diningHall || 'all',
    }
  } catch {
    return { dietaryRestriction: 'none', allergies: '', diningHall: 'all' }
  }
}

function createMessage(role, text) {
  return { role, text, createdAt: new Date().toISOString() }
}

const INITIAL_MESSAGE =
  'Hi! Tell me about your nutrition goals for today and I\'ll find the best meals from the current dining menu. For example: "I want around 2000 calories, 120g protein, and low fat" or "Give me a high-protein day with around 300g carbs."'

function readStoredMessages() {
  try {
    const saved = localStorage.getItem(CHAT_PLANNER_HISTORY_KEY)
    if (!saved) return [createMessage('assistant', INITIAL_MESSAGE)]
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed) || !parsed.length) return [createMessage('assistant', INITIAL_MESSAGE)]
    return parsed
      .filter((e) => e && (e.role === 'user' || e.role === 'assistant') && typeof e.text === 'string' && e.text.trim())
      .map((e) => ({ role: e.role, text: e.text.trim(), createdAt: e.createdAt || undefined }))
  } catch {
    return [createMessage('assistant', INITIAL_MESSAGE)]
  }
}

function formatNumber(value) {
  return Number.isFinite(value) ? Math.round(value).toString() : '0'
}

function formatTimestamp(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return ''
  }
}

function buildExtractionPrompt(chatHistory) {
  const transcript = chatHistory
    .filter((e) => e && typeof e.text === 'string' && e.text.trim())
    .map((e) => `${e.role === 'assistant' ? 'ASSISTANT' : 'USER'}: ${e.text.trim()}`)
    .join('\n')

  return `You are a nutrition assistant. Read the conversation and extract the user's daily macro goals. Also produce a short, friendly reply acknowledging their request.

Conversation:
${transcript}

Rules:
1. Extract numeric targets for calories, protein (grams), carbs (grams), and fat (grams).
2. If the user didn't specify a macro, set it to 0 (meaning "no preference").
3. If the user says things like "high protein", estimate a reasonable number (e.g. 150g). If they say "low fat", estimate a low target (e.g. 40g).
4. If the user mentions a dining hall preference (chase or lenoir), include it. Otherwise set hall to "all".
5. Return ONLY valid JSON. No markdown.

Output shape:
{
  "assistantMessage": "short friendly reply acknowledging what you understood",
  "goals": {
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0
  },
  "hall": "all"
}`
}

function parseModelJson(text) {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fence?.[1]) return JSON.parse(fence[1].trim())
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start !== -1 && end > start) return JSON.parse(trimmed.slice(start, end + 1))
    throw new Error('Could not parse JSON from model response')
  }
}

function MealCard({ title, item }) {
  return (
    <article className="rounded-2xl border border-primary/15 bg-slate-50 p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">{title}</p>
      {item?.items?.length ? (
        <>
          <ul className="mt-3 space-y-2">
            {item.items.map((food) => (
              <li key={`${food.foodName}-${food.section}`} className="rounded-xl bg-white px-3 py-2 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">{food.foodName}</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {food.section} · {food.location}
                </p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-700 sm:grid-cols-4">
            <div>
              <dt className="text-slate-500">Calories</dt>
              <dd className="font-semibold">{formatNumber(item.totals.calories)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Protein</dt>
              <dd className="font-semibold">{formatNumber(item.totals.protein)} g</dd>
            </div>
            <div>
              <dt className="text-slate-500">Carbs</dt>
              <dd className="font-semibold">{formatNumber(item.totals.carbs)} g</dd>
            </div>
            <div>
              <dt className="text-slate-500">Fat</dt>
              <dd className="font-semibold">{formatNumber(item.totals.fat)} g</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No match found for this meal window.</p>
      )}
    </article>
  )
}

export default function ChatPlanner() {
  const { rows, loading: csvLoading, error: csvError } = useDiningMenuCsv()
  const [messages, setMessages] = useState(() => readStoredMessages())
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [extractedGoals, setExtractedGoals] = useState(null)
  const [activePreferences, setActivePreferences] = useState(() => readStoredPreferences())

  const chatRef = useRef(null)
  const resultRef = useRef(null)

  // Persist chat history
  useEffect(() => {
    const clipped = messages.slice(-50)
    localStorage.setItem(CHAT_PLANNER_HISTORY_KEY, JSON.stringify(clipped))
  }, [messages])

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages, isThinking])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const prompt = input.trim()
    if (!prompt || isThinking || csvLoading || csvError) return

    const userMsg = createMessage('user', prompt)
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setError('')
    setIsThinking(true)

    try {
      // Step 1: Ask the LLM to extract macro goals from the conversation
      const { model, baseUrl } = getOllamaConfig()
      const extractionPrompt = buildExtractionPrompt(nextMessages)

      let response
      try {
        response = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: extractionPrompt }],
            stream: false,
            format: 'json',
            options: { temperature: 0.3 },
          }),
        })
      } catch {
        throw new Error(
          `Could not reach Ollama at ${baseUrl}. Make sure Ollama is running (try: ollama serve).`
        )
      }

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || `Ollama API error: ${response.status}`)
      }

      const text = data?.message?.content
      if (typeof text !== 'string' || !text.trim()) {
        throw new Error('Empty response from model')
      }

      const parsed = parseModelJson(text.trim())
      const goals = {
        calories: Number(parsed?.goals?.calories) || 0,
        protein: Number(parsed?.goals?.protein) || 0,
        carbs: Number(parsed?.goals?.carbs) || 0,
        fat: Number(parsed?.goals?.fat) || 0,
      }
      const hall = parsed?.hall || 'all'
      const assistantMessage =
        typeof parsed?.assistantMessage === 'string' && parsed.assistantMessage.trim()
          ? parsed.assistantMessage.trim()
          : 'Got it! Let me find meals that match your goals.'

      setExtractedGoals(goals)

      // Step 2: Use the local mealMatcher algorithm
      const latestPreferences = readStoredPreferences()
      setActivePreferences(latestPreferences)

      // Small delay so the UI shows the "thinking" state
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve()))

      const matched = recommendMeals(rows, goals, hall, latestPreferences)
      setResult(matched)

      // Build a summary of what was found
      const hasAll = matched.breakfast?.items?.length && matched.lunch?.items?.length && matched.dinner?.items?.length
      const totals = matched.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 }
      const summaryNote = hasAll
        ? `\n\nI found meals totaling ~${Math.round(totals.calories)} cal, ${Math.round(totals.protein)}g protein, ${Math.round(totals.carbs)}g carbs, ${Math.round(totals.fat)}g fat. Check the results below!`
        : '\n\nI had trouble finding a full set of meals for those targets. You might want to adjust your goals or try a different hall.'

      setMessages((curr) => [
        ...curr,
        createMessage('assistant', assistantMessage + summaryNote),
      ])

      // Scroll to results
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setMessages((curr) => [
        ...curr,
        createMessage('assistant', 'Sorry, I ran into an issue. Please try again or rephrase your request.'),
      ])
    } finally {
      setIsThinking(false)
    }
  }

  const handleClear = () => {
    setMessages([createMessage('assistant', INITIAL_MESSAGE)])
    setResult(null)
    setExtractedGoals(null)
    setError('')
  }

  const totals = result?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }

  return (
    <section className="rounded-3xl border border-primary/20 bg-white/85 p-8 shadow-[0_24px_60px_-32px_rgba(75,156,211,0.65)] backdrop-blur">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Macro Match · Chat</p>
          <h1 className="mt-3 text-4xl text-slate-900 sm:text-5xl">Chat with the Macro Matcher</h1>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-slate-600">
            Describe your nutrition goals in plain English. The AI will interpret your targets and find the best
            breakfast, lunch, and dinner from today's dining menu.
          </p>
          {activePreferences.dietaryRestriction !== 'none' && (
            <p className="mt-2 text-sm font-medium text-primary">
              Dietary filter active:{' '}
              <span className="font-semibold capitalize">{activePreferences.dietaryRestriction}</span>
              {activePreferences.allergies ? ` · Avoiding: ${activePreferences.allergies}` : ''}
              {' '}(from Preferences)
            </p>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="mt-8 rounded-2xl border border-primary/20 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">Macro Goal Chatbot</h2>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Clear chat
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Your chat history is saved locally and reused for context.
        </p>

        <div ref={chatRef} className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
          {messages.map((msg, i) => (
            <div
              key={`${msg.role}-${i}`}
              className={`rounded-xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'ml-8 border border-primary/30 bg-primary/10 text-slate-800'
                  : 'mr-8 border border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {msg.role === 'user' ? 'You' : 'Assistant'}
              </p>
              <p className="whitespace-pre-line">{msg.text}</p>
              {msg.createdAt && (
                <p className="mt-2 text-[11px] text-slate-400">{formatTimestamp(msg.createdAt)}</p>
              )}
            </div>
          ))}
          {isThinking && (
            <div className="mr-8 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Assistant</p>
              <p className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                Understanding your goals and searching the menu…
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label htmlFor="chatPlannerInput" className="text-sm font-semibold text-slate-800">
            Describe your nutrition goals
          </label>
          <textarea
            id="chatPlannerInput"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Example: "I want 2200 calories with at least 130g protein and under 50g fat, from Chase"'
            rows={3}
            className="w-full rounded-xl border border-primary/30 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-primary/30 transition focus:ring-2"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={csvLoading || isThinking || !input.trim()}
              className="rounded-xl border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3f89bb] disabled:cursor-not-allowed disabled:bg-primary/50"
            >
              {isThinking ? 'Finding meals…' : 'Send'}
            </button>
            <span className="text-xs text-slate-500">
              AI interprets your goals → local matcher finds best meals from the menu.
            </span>
          </div>
        </form>
      </div>

      {/* Status messages */}
      {csvLoading && (
        <p className="mt-5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-slate-700">
          Loading dining menu…
        </p>
      )}
      {csvError && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{csvError}</p>
      )}
      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {/* Extracted goals badge */}
      {extractedGoals && (
        <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-800">Extracted macro targets:</p>
          <p className="mt-1">
            {extractedGoals.calories > 0 && <span className="mr-3">🔥 {extractedGoals.calories} cal</span>}
            {extractedGoals.protein > 0 && <span className="mr-3">💪 {extractedGoals.protein}g protein</span>}
            {extractedGoals.carbs > 0 && <span className="mr-3">🍞 {extractedGoals.carbs}g carbs</span>}
            {extractedGoals.fat > 0 && <span className="mr-3">🥑 {extractedGoals.fat}g fat</span>}
            {!extractedGoals.calories && !extractedGoals.protein && !extractedGoals.carbs && !extractedGoals.fat && (
              <span className="text-slate-500">No specific targets extracted — try being more specific.</span>
            )}
          </p>
        </div>
      )}

      {/* Day totals */}
      {result && (
        <div ref={resultRef} className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Total calories</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatNumber(totals.calories)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Total protein</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatNumber(totals.protein)} g</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Total carbs</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatNumber(totals.carbs)} g</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Total fat</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatNumber(totals.fat)} g</p>
            </div>
          </div>
        </div>
      )}

      {/* Meal results */}
      {result && (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <MealCard title="Breakfast" item={result.breakfast} />
          <MealCard title="Lunch" item={result.lunch} />
          <MealCard title="Dinner" item={result.dinner} />
        </div>
      )}
    </section>
  )
}
