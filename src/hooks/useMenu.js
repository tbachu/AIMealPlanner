import { useEffect, useState } from 'react'

function useMenu() {
  const [menu, setMenu] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    const loadMenu = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/data/menu.json')
        if (!response.ok) {
          throw new Error(`Failed to load menu: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        if (isMounted) {
          setMenu(data)
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load menu')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadMenu()

    return () => {
      isMounted = false
    }
  }, [])

  return { menu, loading, error }
}

export default useMenu
