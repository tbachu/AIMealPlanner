import { useEffect, useState } from 'react'
import Papa from 'papaparse'

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toFlag(value) {
  if (typeof value === 'boolean') {
    return value ? 1 : 0
  }

  if (typeof value === 'number') {
    return value ? 1 : 0
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === '1' || normalized === 'true' ? 1 : 0
  }

  return 0
}

function normalizeRow(row) {
  return {
    foodName: String(row['Food Name'] ?? row.foodName ?? '').trim(),
    diningHall: String(row['Dining Hall'] ?? row.diningHall ?? '').trim().toLowerCase(),
    location: String(row.Location ?? row.location ?? '').trim(),
    section: String(row.Section ?? row.section ?? '').trim(),
    calories: toNumber(row.Calories),
    totalFat: toNumber(row['Total Fat']),
    totalCarbohydrates: toNumber(row['Total Carbohydrates']),
    protein: toNumber(row.Protein),
    sodium: toNumber(row.Sodium),
    vegan: toFlag(row.Vegan) === 1,
    vegetarian: toFlag(row.Vegetarian) === 1,
    madeWithoutGluten: toFlag(row['Made Without Gluten']) === 1,
    halal: toFlag(row.Halal) === 1,
    organic: toFlag(row.Organic) === 1,
    breakfast: toFlag(row.breakfast),
    lunch: toFlag(row.lunch),
    lateLunch: toFlag(row['late lunch']),
    dinner: toFlag(row.dinner),
    lateDinner: toFlag(row['late dinner']),
    lateNight: toFlag(row['late night']),
  }
}

export default function useDiningMenuCsv() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/data/dining_menu.csv')
        if (!response.ok) {
          throw new Error(`Failed to load dining CSV: ${response.status} ${response.statusText}`)
        }

        const text = await response.text()
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
        })

        if (parsed.errors?.length) {
          throw new Error(parsed.errors[0]?.message || 'Unable to parse dining CSV')
        }

        const normalizedRows = (parsed.data ?? [])
          .filter((row) => row && typeof row === 'object')
          .map(normalizeRow)
          .filter((row) => row.foodName)

        if (active) {
          setRows(normalizedRows)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load dining CSV')
          setRows([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  return { rows, loading, error }
}
