import { useMemo, useState } from 'react'
import useDiningMenuCsv from '../hooks/useDiningMenuCsv'
import { recommendMeals } from '../utils/mealMatcher'

const DEFAULTS = {
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  hall: 'all',
}

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return '0'
  }

  return Math.round(value).toString()
}

function mealLabel(hall) {
  if (hall === 'lenoir') return 'Lenoir'
  if (hall === 'chase') return 'Chase'
  return 'Both halls'
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

export default function MacroGoalFinder() {
  const { rows, loading, error } = useDiningMenuCsv()
  const [form, setForm] = useState(DEFAULTS)
  const [result, setResult] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [message, setMessage] = useState('Enter macro goals to find a best-fit breakfast, lunch, and dinner.')

  const halls = useMemo(() => ['all', 'chase', 'lenoir'], [])

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const goals = {
      calories: toNumber(form.calories),
      protein: toNumber(form.protein),
      carbs: toNumber(form.carbs),
      fat: toNumber(form.fat),
    }

    if (!goals.calories && !goals.protein && !goals.carbs && !goals.fat) {
      setResult(null)
      setMessage('Add at least one goal before searching.')
      return
    }

    setIsSearching(true)
    setMessage('Searching the menu for a realistic multi-item meal set…')

    await new Promise((resolve) => window.requestAnimationFrame(() => resolve()))

    const matched = recommendMeals(rows, goals, form.hall)
    setResult(matched)
    setIsSearching(false)

    if (!matched.breakfast?.items?.length || !matched.lunch?.items?.length || !matched.dinner?.items?.length) {
      setMessage('No full breakfast/lunch/dinner match was found for those targets. Try loosening the goals or switching halls.')
      return
    }

    setMessage(`Best-fit plan found for ${mealLabel(form.hall)}.`)
  }

  const totals = result?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }

  return (
    <section className="rounded-3xl border border-primary/20 bg-white/85 p-8 shadow-[0_24px_60px_-32px_rgba(75,156,211,0.65)] backdrop-blur">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Macro Match</p>
          <h1 className="mt-3 text-4xl text-slate-900 sm:text-5xl">Breakfast, lunch, dinner from the menu</h1>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-slate-600">
            Enter calorie, protein, carb, and fat targets. The matcher will build a breakfast, lunch, and dinner plate with multiple items from the live dining CSV.
          </p>
        </div>

        <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-primary">
          {loading ? 'Loading dining CSV…' : error ? error : message}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <label className="flex flex-col text-sm font-semibold text-slate-700">
          Calorie goal
          <input
            type="number"
            min="0"
            step="1"
            value={form.calories}
            onChange={handleChange('calories')}
            className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
            placeholder="e.g. 2200"
          />
        </label>

        <label className="flex flex-col text-sm font-semibold text-slate-700">
          Protein goal (g)
          <input
            type="number"
            min="0"
            step="1"
            value={form.protein}
            onChange={handleChange('protein')}
            className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
            placeholder="e.g. 150"
          />
        </label>

        <label className="flex flex-col text-sm font-semibold text-slate-700">
          Carbs goal (g)
          <input
            type="number"
            min="0"
            step="1"
            value={form.carbs}
            onChange={handleChange('carbs')}
            className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
            placeholder="e.g. 250"
          />
        </label>

        <label className="flex flex-col text-sm font-semibold text-slate-700">
          Fat goal (g)
          <input
            type="number"
            min="0"
            step="1"
            value={form.fat}
            onChange={handleChange('fat')}
            className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
            placeholder="e.g. 70"
          />
        </label>

        <label className="flex flex-col text-sm font-semibold text-slate-700">
          Dining hall
          <select
            value={form.hall}
            onChange={handleChange('hall')}
            className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
          >
            {halls.map((hall) => (
              <option key={hall} value={hall}>
                {mealLabel(hall)}
              </option>
            ))}
          </select>
        </label>

        <div className="sm:col-span-2 xl:col-span-5">
          <button
            type="submit"
            disabled={loading || isSearching}
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:bg-primary/90"
          >
            {isSearching ? 'Finding meals...' : 'Find meals'}
          </button>
        </div>
      </form>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
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

      {result && (
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <MealCard title="Breakfast" item={result.breakfast} />
          <MealCard title="Lunch" item={result.lunch} />
          <MealCard title="Dinner" item={result.dinner} />
        </div>
      )}
    </section>
  )
}
