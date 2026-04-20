import { useEffect, useMemo, useState } from 'react'
import useMenu from '../hooks/useMenu'

const HALLS = ['chase', 'lenoir']

/** Local calendar date as YYYY-MM-DD (not UTC from toISOString). */
function localISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Meal service windows (same for Chase and Lenoir). End is exclusive. */
const MEAL_WINDOWS = {
  breakfast: { startMin: 7 * 60, endMin: 10 * 60 + 30 },
  lunch: { startMin: 11 * 60, endMin: 14 * 60 },
  dinner: { startMin: 16 * 60 + 30, endMin: 21 * 60 },
}

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner']

function minutesSinceLocalMidnight(date) {
  return date.getHours() * 60 + date.getMinutes()
}

function isMealOpen(mealKey, date) {
  const { startMin, endMin } = MEAL_WINDOWS[mealKey]
  const now = minutesSinceLocalMidnight(date)
  return now >= startMin && now < endMin
}

function formatMealHours(mealKey) {
  if (mealKey === 'breakfast') return '7:00–10:30 a.m.'
  if (mealKey === 'lunch') return '11:00 a.m.–2:00 p.m.'
  return '4:30–9:00 p.m.'
}

function Home() {
  const { menu, loading, error } = useMenu()
  const [hall, setHall] = useState('chase')
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const todayKey = useMemo(() => localISODate(now), [now])

  const dayMenu = menu && typeof menu === 'object' ? menu[todayKey] : null
  const hallMenu =
    dayMenu && hall in dayMenu && typeof dayMenu[hall] === 'object' ? dayMenu[hall] : null

  const formattedToday = useMemo(
    () =>
      now.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    [now],
  )

  return (
    <section className="rounded-3xl border border-primary/20 bg-white/85 p-8 shadow-[0_24px_60px_-32px_rgba(75,156,211,0.65)] backdrop-blur">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Home</p>
      <h1 className="mt-3 text-4xl text-slate-900 sm:text-5xl">Today&apos;s dining halls</h1>
      <p className="mt-2 text-slate-600">{formattedToday}</p>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-slate-700">Dining hall</p>
        <div
          className="inline-flex rounded-full border border-primary/25 bg-primary/5 p-1"
          role="group"
          aria-label="Choose dining hall"
        >
          {HALLS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setHall(id)}
              className={[
                'rounded-full px-5 py-2 text-sm font-semibold capitalize transition-colors',
                hall === id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-primary hover:bg-primary/10',
              ].join(' ')}
            >
              {id}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="mt-10 text-center text-slate-600" role="status">
          Loading menus…
        </p>
      )}

      {error && !loading && (
        <p className="mt-10 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && !dayMenu && (
        <p className="mt-10 text-center text-slate-600">
          No menu posted for <span className="font-semibold text-slate-800">{todayKey}</span>.
        </p>
      )}

      {!loading && !error && dayMenu && !hallMenu && (
        <p className="mt-10 text-center text-slate-600">
          No menu found for <span className="capitalize font-semibold text-slate-800">{hall}</span> today.
        </p>
      )}

      {!loading && !error && hallMenu && (
        <div className="mt-10 space-y-10">
          {MEAL_ORDER.map((mealKey) => {
            const open = isMealOpen(mealKey, now)
            const items = Array.isArray(hallMenu[mealKey]) ? hallMenu[mealKey] : []

            return (
              <div key={mealKey}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-3">
                  <h2 className="text-2xl capitalize text-slate-900">{mealKey}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-slate-500">{formatMealHours(mealKey)}</span>
                    <span
                      className={[
                        'rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide',
                        open ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700',
                      ].join(' ')}
                    >
                      {open ? 'Open' : 'Closed'}
                    </span>
                  </div>
                </div>
                {items.length === 0 ? (
                  <p className="mt-4 text-slate-500">No items listed for this meal.</p>
                ) : (
                  <ul className="mt-4 list-inside list-disc space-y-2 text-slate-700 marker:text-primary">
                    {items.map((item) => (
                      <li key={item} className="pl-1">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default Home
