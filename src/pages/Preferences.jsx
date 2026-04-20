import { useState } from 'react'

const STORAGE_KEY = 'aimealplanner.preferences'

const DEFAULTS = {
  dietaryRestriction: 'none',
  allergies: '',
  diningHall: 'chase',
  mealSwipesRemaining: 0,
}

function normalizeStored(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULTS }
  }

  let dietary = raw.dietaryRestriction
  if (!['none', 'vegetarian', 'vegan'].includes(dietary)) {
    dietary = DEFAULTS.dietaryRestriction
  }

  let hall =
    typeof raw.diningHall === 'string' ? raw.diningHall.toLowerCase() : ''
  if (hall !== 'chase' && hall !== 'lenoir') {
    hall = DEFAULTS.diningHall
  }

  let swipes = Number(raw.mealSwipesRemaining)
  if (!Number.isFinite(swipes)) {
    swipes = DEFAULTS.mealSwipesRemaining
  }
  swipes = Math.min(21, Math.max(0, Math.round(swipes)))

  const allergies = typeof raw.allergies === 'string' ? raw.allergies : ''

  return {
    dietaryRestriction: dietary,
    allergies,
    diningHall: hall,
    mealSwipesRemaining: swipes,
  }
}

function readPreferences() {
  try {
    const item = localStorage.getItem(STORAGE_KEY)
    if (!item) {
      return { ...DEFAULTS }
    }
    return normalizeStored(JSON.parse(item))
  } catch {
    return { ...DEFAULTS }
  }
}

function writePreferences(prefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export default function Preferences() {
  const [prefs, setPrefs] = useState(() => readPreferences())
  const [savedHint, setSavedHint] = useState(false)

  const fieldClass =
    'mt-2 w-full max-w-md rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25'

  const handleSave = () => {
    const next = normalizeStored(prefs)
    setPrefs(next)
    writePreferences(next)
    setSavedHint(true)
    window.setTimeout(() => setSavedHint(false), 2200)
  }

  const setSwipes = (value) => {
    const n = Number.parseInt(value, 10)
    if (Number.isNaN(n)) {
      setPrefs((p) => ({ ...p, mealSwipesRemaining: 0 }))
      return
    }
    setPrefs((p) => ({
      ...p,
      mealSwipesRemaining: Math.min(21, Math.max(0, n)),
    }))
  }

  return (
    <section className="rounded-3xl border border-primary/20 bg-white/85 p-8 shadow-[0_24px_60px_-32px_rgba(75,156,211,0.65)] backdrop-blur">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
        Preferences
      </p>
      <h1 className="mt-3 text-4xl text-slate-900 sm:text-5xl">
        Your dining preferences
      </h1>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">
        These settings are stored on this device only. Update them anytime and
        save when you are ready.
      </p>

      <div className="mt-10 flex max-w-xl flex-col gap-8">
        <fieldset>
          <legend className="text-sm font-semibold text-slate-800">
            Dietary restriction
          </legend>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
            {[
              { value: 'none', label: 'None' },
              { value: 'vegetarian', label: 'Vegetarian' },
              { value: 'vegan', label: 'Vegan' },
            ].map((opt) => (
              <label
                key={opt.value}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
              >
                <input
                  type="radio"
                  name="dietaryRestriction"
                  value={opt.value}
                  checked={prefs.dietaryRestriction === opt.value}
                  onChange={() =>
                    setPrefs((p) => ({ ...p, dietaryRestriction: opt.value }))
                  }
                  className="size-4 accent-primary"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="allergies" className="text-sm font-semibold text-slate-800">
            Allergies
          </label>
          <input
            id="allergies"
            type="text"
            value={prefs.allergies}
            onChange={(e) =>
              setPrefs((p) => ({ ...p, allergies: e.target.value }))
            }
            placeholder="e.g. peanuts, shellfish"
            className={fieldClass}
            autoComplete="off"
          />
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-slate-800">
            Preferred dining hall
          </legend>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-4">
            {[
              { value: 'chase', label: 'Chase' },
              { value: 'lenoir', label: 'Lenoir' },
            ].map((opt) => (
              <label
                key={opt.value}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
              >
                <input
                  type="radio"
                  name="diningHall"
                  value={opt.value}
                  checked={prefs.diningHall === opt.value}
                  onChange={() =>
                    setPrefs((p) => ({ ...p, diningHall: opt.value }))
                  }
                  className="size-4 accent-primary"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="mealSwipes"
            className="text-sm font-semibold text-slate-800"
          >
            Meal swipes remaining this week
          </label>
          <input
            id="mealSwipes"
            type="number"
            min={0}
            max={21}
            step={1}
            value={prefs.mealSwipesRemaining}
            onChange={(e) => setSwipes(e.target.value)}
            className={`${fieldClass} max-w-[12rem]`}
          />
          <p className="mt-1.5 text-xs text-slate-500">Enter a whole number from 0 to 21.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Save preferences
          </button>
          {savedHint ? (
            <span className="text-sm font-medium text-emerald-700" role="status">
              Preferences saved.
            </span>
          ) : null}
        </div>
      </div>
    </section>
  )
}
