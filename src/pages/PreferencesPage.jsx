function PreferencesPage() {
  return (
    <section className="rounded-3xl border border-primary/20 bg-white/85 p-8 shadow-[0_24px_60px_-32px_rgba(75,156,211,0.65)] backdrop-blur">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
        Preferences
      </p>
      <h1 className="mt-3 text-4xl text-slate-900 sm:text-5xl">
        Preferences and Settings
      </h1>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">
        Placeholder settings for dietary goals, allergy filters, favorite cuisines,
        and notification preferences.
      </p>
    </section>
  )
}

export default PreferencesPage
