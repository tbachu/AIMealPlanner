import { useEffect, useRef, useState } from 'react'
import { generateMealPlanFromChat } from '../gemini'
import useMenu from '../hooks/useMenu'

const DAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const MEAL_PERIODS = ['breakfast', 'lunch', 'dinner']

const CHAT_HISTORY_STORAGE_KEY = 'aimealplanner.ai.chatHistory'
const PLAN_STORAGE_KEY = 'aimealplanner.ai.latestPlan'

const INITIAL_ASSISTANT_MESSAGE =
  'Tell me your goals and constraints, and I will generate a 7-day plan from the live menu. Example: vegetarian, no peanuts, prefer Lenoir, high-protein lunches.'

function createMessage(role, text) {
  return {
    role,
    text,
    createdAt: new Date().toISOString(),
  }
}

function readStoredMessages() {
  if (typeof window === 'undefined') {
    return [createMessage('assistant', INITIAL_ASSISTANT_MESSAGE)]
  }

  const saved = window.localStorage.getItem(CHAT_HISTORY_STORAGE_KEY)
  if (!saved) {
    return [createMessage('assistant', INITIAL_ASSISTANT_MESSAGE)]
  }

  try {
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [createMessage('assistant', INITIAL_ASSISTANT_MESSAGE)]
    }

    const normalized = parsed
      .filter((entry) => {
        return (
          entry &&
          (entry.role === 'user' || entry.role === 'assistant') &&
          typeof entry.text === 'string' &&
          entry.text.trim()
        )
      })
      .map((entry) => ({
        role: entry.role,
        text: entry.text.trim(),
        createdAt:
          typeof entry.createdAt === 'string' && entry.createdAt
            ? entry.createdAt
            : undefined,
      }))

    return normalized.length > 0
      ? normalized
      : [createMessage('assistant', INITIAL_ASSISTANT_MESSAGE)]
  } catch {
    return [createMessage('assistant', INITIAL_ASSISTANT_MESSAGE)]
  }
}

function formatLabel(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function normalizeGeneratedPlan(rawPlan) {
  if (!rawPlan || typeof rawPlan !== 'object') {
    throw new Error('Generated plan is not valid JSON object data.')
  }

  const dayMap = {}
  const dateMap = {}

  Object.entries(rawPlan).forEach(([key, value]) => {
    if (!value || typeof value !== 'object') {
      return
    }

    const loweredKey = key.toLowerCase()
    if (DAY_ORDER.includes(loweredKey)) {
      dayMap[loweredKey] = value
      return
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      dateMap[key] = value
    }
  })

  const orderedDatePlans = Object.keys(dateMap)
    .sort()
    .map((dateKey) => dateMap[dateKey])

  return DAY_ORDER.reduce((plan, day) => {
    const daySource = dayMap[day] ?? orderedDatePlans[DAY_ORDER.indexOf(day)] ?? {}

    const dayPlan = Object.entries(daySource).reduce((mealMap, [mealKey, mealValue]) => {
      mealMap[mealKey.toLowerCase()] = mealValue
      return mealMap
    }, {})

    plan[day] = MEAL_PERIODS.reduce((mealPlan, meal) => {
      const value = dayPlan[meal]
      mealPlan[meal] =
        typeof value === 'string' && value.trim() ? value.trim() : 'Not provided'
      return mealPlan
    }, {})

    return plan
  }, {})
}

function readStoredPlanState() {
  if (typeof window === 'undefined') {
    return { plan: null, generatedAt: '' }
  }

  const saved = window.localStorage.getItem(PLAN_STORAGE_KEY)
  if (!saved) {
    return { plan: null, generatedAt: '' }
  }

  try {
    const parsed = JSON.parse(saved)
    const plan = parsed?.plan ? normalizeGeneratedPlan(parsed.plan) : null
    const generatedAt =
      typeof parsed?.generatedAt === 'string' ? parsed.generatedAt : ''
    return { plan, generatedAt }
  } catch {
    return { plan: null, generatedAt: '' }
  }
}

function countProvidedMeals(plan) {
  if (!plan) {
    return 0
  }

  return DAY_ORDER.reduce((dayTotal, day) => {
    const mealTotal = MEAL_PERIODS.reduce((total, meal) => {
      return plan?.[day]?.[meal] && plan[day][meal] !== 'Not provided'
        ? total + 1
        : total
    }, 0)
    return dayTotal + mealTotal
  }, 0)
}

function formatTimestamp(isoDate) {
  if (!isoDate) {
    return ''
  }

  try {
    return new Date(isoDate).toLocaleString()
  } catch {
    return ''
  }
}

function AIGenerator() {
  const { menu, loading: menuLoading, error: menuError } = useMenu()

  const [messages, setMessages] = useState(() => readStoredMessages())
  const [planState, setPlanState] = useState(() => readStoredPlanState())
  const [chatInput, setChatInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  const chatHistoryRef = useRef(null)
  const planSectionRef = useRef(null)
  const shouldAutoScrollPlanRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const clippedMessages = messages.slice(-50)
    window.localStorage.setItem(
      CHAT_HISTORY_STORAGE_KEY,
      JSON.stringify(clippedMessages)
    )
  }, [messages])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (planState.plan) {
      window.localStorage.setItem(
        PLAN_STORAGE_KEY,
        JSON.stringify({
          generatedAt: planState.generatedAt,
          plan: planState.plan,
        })
      )
      return
    }

    window.localStorage.removeItem(PLAN_STORAGE_KEY)
  }, [planState])

  useEffect(() => {
    if (!chatHistoryRef.current) {
      return
    }

    chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight
  }, [messages, isGenerating])

  useEffect(() => {
    if (!planState.plan || !planSectionRef.current || !shouldAutoScrollPlanRef.current) {
      return
    }

    planSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    shouldAutoScrollPlanRef.current = false
  }, [planState.plan])

  const handleGenerate = async (event) => {
    event.preventDefault()

    const prompt = chatInput.trim()
    if (!prompt || isGenerating || !canGenerate) {
      return
    }

    const userMessage = createMessage('user', prompt)
    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setChatInput('')
    setError('')
    setIsGenerating(true)

    try {
      const response = await generateMealPlanFromChat(nextMessages, menu)
      const normalized = normalizeGeneratedPlan(response.plan)

      shouldAutoScrollPlanRef.current = true
      setPlanState({
        generatedAt: new Date().toISOString(),
        plan: normalized,
      })

      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage('assistant', response.assistantMessage),
      ])
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'Failed to generate meal plan.'
      )
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage(
          'assistant',
          'I could not generate a plan this time. Please update your request and try again.'
        ),
      ])
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClearChat = () => {
    setMessages([createMessage('assistant', INITIAL_ASSISTANT_MESSAGE)])
    setPlanState({ plan: null, generatedAt: '' })
    setError('')
  }

  const canGenerate = !menuLoading && !menuError && Boolean(menu)
  const generatedPlan = planState.plan
  const providedMealCount = countProvidedMeals(generatedPlan)

  return (
    <section className="rounded-3xl border border-primary/20 bg-white/85 p-8 shadow-[0_24px_60px_-32px_rgba(75,156,211,0.65)] backdrop-blur">
      <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
            AI
          </p>
          <h1 className="mt-3 text-4xl text-slate-900 sm:text-5xl">
            AI Meal Plan Generator
          </h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            Chat with the assistant and it will generate a 7-day plan from the current menu.
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-primary/20 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">Meal plan chatbot</h2>
          <button
            type="button"
            onClick={handleClearChat}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Clear chat history
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Chat history is saved on this device and reused in future prompts.
        </p>

        <div ref={chatHistoryRef} className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-xl px-4 py-3 text-sm ${
                message.role === 'user'
                  ? 'ml-8 border border-primary/30 bg-primary/10 text-slate-800'
                  : 'mr-8 border border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {message.role === 'user' ? 'You' : 'Assistant'}
              </p>
              <p>{message.text}</p>
              {message.createdAt && (
                <p className="mt-2 text-[11px] text-slate-400">
                  {formatTimestamp(message.createdAt)}
                </p>
              )}
            </div>
          ))}

          {isGenerating && (
            <div className="mr-8 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Assistant
              </p>
              <p>Thinking and generating your weekly plan...</p>
            </div>
          )}
        </div>

        <form onSubmit={handleGenerate} className="mt-4 flex flex-col gap-3">
          <label htmlFor="chatPrompt" className="text-sm font-semibold text-slate-800">
            Tell the assistant what you want this week
          </label>
          <textarea
            id="chatPrompt"
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="Example: Build me a vegetarian plan for Chase, no peanuts, and lighter dinners."
            rows={3}
            className="w-full rounded-xl border border-primary/30 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-primary/30 transition focus:ring-2"
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!canGenerate || isGenerating || !chatInput.trim()}
              className="rounded-xl border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3f89bb] disabled:cursor-not-allowed disabled:bg-primary/50"
            >
              {isGenerating ? 'Generating plan...' : 'Send to assistant'}
            </button>
            <span className="text-xs text-slate-500">
              The assistant will use the current menu data for generation.
            </span>
            {generatedPlan && (
              <button
                type="button"
                onClick={() =>
                  planSectionRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
                }
                className="rounded-lg border border-primary/35 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/5"
              >
                View latest plan
              </button>
            )}
          </div>
        </form>

        {generatedPlan && (
          <p className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-slate-700">
            Latest plan generated {formatTimestamp(planState.generatedAt)}. Filled meals:{' '}
            {providedMealCount}/21.
          </p>
        )}
      </div>

      {menuLoading && (
        <p className="mb-5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-slate-700">
          Loading current menu...
        </p>
      )}

      {menuError && (
        <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {menuError}
        </p>
      )}

      {error && (
        <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {generatedPlan ? (
        <div ref={planSectionRef} className="rounded-2xl border border-primary/20 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Generated 7-day plan</h2>
              <p className="text-xs text-slate-500">
                Created {formatTimestamp(planState.generatedAt)}
              </p>
            </div>
            {providedMealCount === 0 && (
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                The assistant response did not include meal values. Try clarifying your request.
              </p>
            )}
          </div>

          <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[72rem] grid-cols-7 gap-4">
            {DAY_ORDER.map((day) => (
              <div
                key={day}
                className="rounded-2xl border border-primary/20 bg-white p-4 shadow-sm"
              >
                <h2 className="mb-3 text-lg font-bold text-slate-900">
                  {formatLabel(day)}
                </h2>

                <div className="space-y-3">
                  {MEAL_PERIODS.map((mealPeriod) => (
                    <div key={mealPeriod} className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {mealPeriod}
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {generatedPlan[day][mealPeriod]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      ) : (
        <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-slate-700">
          Your generated plan will appear here after you send a prompt.
        </p>
      )}
    </section>
  )
}

export default AIGenerator
