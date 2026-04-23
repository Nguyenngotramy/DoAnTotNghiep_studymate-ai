import { useState, useEffect } from 'react'
import { useDebounce } from './useDebounce'
import api from '@/api/axios'

export function useSearch(query: string) {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const debounced = useDebounce(query, 400)

  useEffect(() => {
    if (!debounced || debounced.length < 2) { setResults(null); return }
    setLoading(true)
    api.get('/search', { params: { q: debounced } })
      .then(r => setResults(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [debounced])

  return { results, loading }
}
