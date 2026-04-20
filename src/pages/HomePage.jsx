function HomePage() {
  return (
    <section className="rounded-3xl border border-primary/20 bg-white/85 p-8 shadow-[0_24px_60px_-32px_rgba(75,156,211,0.65)] backdrop-blur">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
        Home
      </p>
      <h1 className="mt-3 text-4xl text-slate-900 sm:text-5xl">
        Welcome to AIMealPlanner
      </h1>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">
        This is a placeholder for the dashboard overview. Add summaries of upcoming
        meals, grocery reminders, and quick actions here.
      </p>
    </section>
  )
}

export default HomePage
