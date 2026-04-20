import { useEffect, useMemo, useState } from 'react'
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
const PLAN_STORAGE_KEY = 'mealPlanner.weekPlan'
const HALL_STORAGE_KEY = 'mealPlanner.selectedHall'

function createEmptyWeekPlan() {
  return DAY_ORDER.reduce((weekPlan, day) => {
    weekPlan[day] = {
      breakfast: '',
      lunch: '',
      dinner: '',
    }

    return weekPlan
  }, {})
}

function normalizeSavedPlan(savedPlan) {
  const defaultPlan = createEmptyWeekPlan()
  if (!savedPlan || typeof savedPlan !== 'object') {
    return defaultPlan
  }

  return DAY_ORDER.reduce((normalizedPlan, day) => {
    const dayPlan = savedPlan[day]

    normalizedPlan[day] = {
      breakfast: typeof dayPlan?.breakfast === 'string' ? dayPlan.breakfast : '',
      lunch: typeof dayPlan?.lunch === 'string' ? dayPlan.lunch : '',
      dinner: typeof dayPlan?.dinner === 'string' ? dayPlan.dinner : '',
    }

    return normalizedPlan
  }, {})
}

function getStoredWeekPlan() {
  if (typeof window === 'undefined') {
    return createEmptyWeekPlan()
  }

  const savedPlan = window.localStorage.getItem(PLAN_STORAGE_KEY)
  if (!savedPlan) {
    return createEmptyWeekPlan()
  }

  try {
    return normalizeSavedPlan(JSON.parse(savedPlan))
  } catch {
    return createEmptyWeekPlan()
  }
}

function getStoredHall() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.localStorage.getItem(HALL_STORAGE_KEY) || ''
}

function formatLabel(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function Planner() {
  const { menu, loading, error } = useMenu()
  const [weekPlan, setWeekPlan] = useState(() => getStoredWeekPlan())
  const [selectedHall, setSelectedHall] = useState(() => getStoredHall())

  const halls = useMemo(() => {
    if (!menu || typeof menu !== 'object') {
      return []
    }

    return Object.keys(menu)
  }, [menu])

  const activeHall = useMemo(() => {
    if (!halls.length) {
      return ''
    }

    if (selectedHall && halls.includes(selectedHall)) {
      return selectedHall
    }

    return halls[0]
  }, [halls, selectedHall])

  useEffect(() => {
    window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(weekPlan))
  }, [weekPlan])

  useEffect(() => {
    if (!activeHall) {
      return
    }

    window.localStorage.setItem(HALL_STORAGE_KEY, activeHall)
  }, [activeHall])

  const getMealOptions = (day, mealPeriod) => {
    const options = menu?.[activeHall]?.[day]?.[mealPeriod]
    if (!Array.isArray(options)) {
      return []
    }

    return options
  }

  const updateMealSelection = (day, mealPeriod, value) => {
    setWeekPlan((currentPlan) => ({
      ...currentPlan,
      [day]: {
        ...currentPlan[day],
        [mealPeriod]: value,
      },
    }))
  }

  const clearWeek = () => {
    setWeekPlan(createEmptyWeekPlan())
  }

  return (
    <section className="rounded-3xl border border-primary/20 bg-white/85 p-8 shadow-[0_24px_60px_-32px_rgba(75,156,211,0.65)] backdrop-blur">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
            Planner
          </p>
          <h1 className="mt-3 text-4xl text-slate-900 sm:text-5xl">Weekly Meal Planner</h1>
          <p className="mt-3 text-slate-600">
            Choose one meal for each slot, and your plan will stay saved in this browser.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700" htmlFor="hall-select">
            Dining hall
            <select
              id="hall-select"
              value={activeHall}
              onChange={(event) => setSelectedHall(event.target.value)}
              className="min-w-[12rem] rounded-xl border border-primary/30 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none ring-primary/30 transition focus:ring-2"
              disabled={loading || !halls.length}
            >
              {!halls.length && <option value="">No halls available</option>}
              {halls.map((hall) => (
                <option key={hall} value={hall}>
                  {formatLabel(hall)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={clearWeek}
            className="rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3f89bb]"
          >
            Clear week
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[72rem] grid-cols-7 gap-4">
          {DAY_ORDER.map((day) => (
            <div key={day} className="rounded-2xl border border-primary/20 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-bold text-slate-900">{formatLabel(day)}</h2>

              <div className="space-y-3">
                {MEAL_PERIODS.map((mealPeriod) => {
                  const options = getMealOptions(day, mealPeriod)
                  const selectedValue = weekPlan[day][mealPeriod]

                  return (
                    <label key={mealPeriod} className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                      {formatLabel(mealPeriod)}
                      <select
                        value={selectedValue}
                        onChange={(event) =>
                          updateMealSelection(day, mealPeriod, event.target.value)
                        }
                        className="w-full rounded-xl border border-primary/30 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none ring-primary/30 transition focus:ring-2 disabled:bg-slate-100 disabled:text-slate-400"
                        disabled={loading || !activeHall || !options.length}
                      >
                        <option value="">
                          {loading
                            ? 'Loading menu...'
                            : options.length
                              ? `Select ${mealPeriod}`
                              : 'No options'}
                        </option>
                        {options.map((item, index) => {
                          const label = typeof item === 'string' ? item : String(item)
                          return (
                            <option key={`${day}-${mealPeriod}-${label}-${index}`} value={label}>
                              {label}
                            </option>
                          )
                        })}
                      </select>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Planner
