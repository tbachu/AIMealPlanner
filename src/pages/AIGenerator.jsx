import { useState } from 'react'
import { generateMealPlan } from '../gemini'
import useMenu from '../hooks/useMenu'

const PREFERENCES_STORAGE_KEY = 'aimealplanner.preferences'

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

const DEFAULT_PREFERENCES = {
  dietaryRestriction: 'none',
  allergies: '',
  diningHall: 'chase',
}

function formatLabel(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function normalizePreferences(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_PREFERENCES }
  }

  const dietaryRestriction = ['none', 'vegetarian', 'vegan'].includes(
    raw.dietaryRestriction
  )
    ? raw.dietaryRestriction
    : DEFAULT_PREFERENCES.dietaryRestriction

  const allergies = typeof raw.allergies === 'string' ? raw.allergies : ''

  const hall =
    typeof raw.diningHall === 'string' ? raw.diningHall.toLowerCase() : ''
  const diningHall = hall === 'chase' || hall === 'lenoir' ? hall : 'chase'

  const normalized = {
    dietaryRestriction,
    allergies,
    diningHall,
  }

  if (Number.isFinite(raw.swipesRemaining)) {
    normalized.swipesRemaining = raw.swipesRemaining
  } else if (Number.isFinite(raw.swipes)) {
    normalized.swipes = raw.swipes
  }

  return normalized
}

function readSavedPreferences() {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_PREFERENCES }
  }

  const saved = window.localStorage.getItem(PREFERENCES_STORAGE_KEY)
  if (!saved) {
    return { ...DEFAULT_PREFERENCES }
  }

  try {
    return normalizePreferences(JSON.parse(saved))
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

function normalizeGeneratedPlan(rawPlan) {
  if (!rawPlan || typeof rawPlan !== 'object') {
    throw new Error('Generated plan is not valid JSON object data.')
  }

  const dayMap = Object.entries(rawPlan).reduce((map, [key, value]) => {
    map[key.toLowerCase()] = value
    return map
  }, {})

  return DAY_ORDER.reduce((plan, day) => {
    const dayPlan =
      dayMap[day] && typeof dayMap[day] === 'object' ? dayMap[day] : {}

    plan[day] = MEAL_PERIODS.reduce((mealPlan, meal) => {
      const value = dayPlan[meal]
      mealPlan[meal] =
        typeof value === 'string' && value.trim() ? value.trim() : 'Not provided'
      return mealPlan
    }, {})

    return plan
  }, {})
}

function AIGenerator() {
  const { menu, loading: menuLoading, error: menuError } = useMenu()
  const [preferences] = useState(() => readSavedPreferences())
  const [generatedPlan, setGeneratedPlan] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    setError('')
    setGeneratedPlan(null)
    setIsGenerating(true)

    try {
      const response = await generateMealPlan(preferences, menu)
      const normalized = normalizeGeneratedPlan(response)
      setGeneratedPlan(normalized)
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'Failed to generate meal plan.'
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const canGenerate = !menuLoading && !menuError && menu

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
            Generate a full 7-day plan from the current menu using your saved preferences.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate || isGenerating}
          className="rounded-xl border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3f89bb] disabled:cursor-not-allowed disabled:bg-primary/50"
        >
          {isGenerating ? 'Generating...' : 'Generate my meal plan'}
        </button>
      </div>

      <div className="mb-6 rounded-2xl border border-primary/20 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Saved preferences</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Dietary restriction
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {formatLabel(preferences.dietaryRestriction)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Allergies
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {preferences.allergies.trim() ? preferences.allergies : 'None listed'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Dining hall
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {formatLabel(preferences.diningHall)}
            </p>
          </div>
        </div>
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

      {generatedPlan && (
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
      )}
    </section>
  )
}

export default AIGenerator
