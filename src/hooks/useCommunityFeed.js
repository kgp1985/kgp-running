import { useState, useEffect, useCallback } from 'react'
import { fetchCommunityFeed, fetchPRsForUsers, fetchShoesForUsers } from '../api/communityApi.js'

const PAGE_SIZE = 30

/**
 * Hook that drives the community feed page.
 *
 * Returns:
 *   runs        — enriched run objects with displayName, prMap entry, shoeName
 *   prsMap      — Map<userId, { 'Marathon': { time, date }, ... }>
 *   shoesMap    — Map<shoeId, shoeName>
 *   loading     — initial load in progress
 *   loadingMore — pagination in progress
 *   hasMore     — whether more pages exist
 *   loadMore()  — fetch next page
 *   refresh()   — re-fetch from scratch
 */
export function useCommunityFeed() {
  const [runs, setRuns]         = useState([])
  const [prsMap, setPrsMap]     = useState(new Map())
  const [shoesMap, setShoesMap] = useState(new Map())
  const [loading, setLoading]   = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]   = useState(true)
  const [offset, setOffset]     = useState(0)

  const loadPage = useCallback(async (pageOffset, replace = false) => {
    if (replace) setLoading(true)
    else setLoadingMore(true)

    try {
      const newRuns = await fetchCommunityFeed({ limit: PAGE_SIZE, offset: pageOffset })

      // Collect all unique user IDs to batch-fetch PRs + shoes
      const allUserIds = [...new Set(newRuns.map(r => r.userId))]
      const [newPrsMap, newShoesMap] = await Promise.all([
        fetchPRsForUsers(allUserIds),
        fetchShoesForUsers(allUserIds),
      ])

      if (replace) {
        setRuns(newRuns)
        setPrsMap(newPrsMap)
        setShoesMap(newShoesMap)
      } else {
        setRuns(prev => {
          const ids = new Set(prev.map(r => r.id))
          return [...prev, ...newRuns.filter(r => !ids.has(r.id))]
        })
        setPrsMap(prev => new Map([...prev, ...newPrsMap]))
        setShoesMap(prev => new Map([...prev, ...newShoesMap]))
      }

      setHasMore(newRuns.length === PAGE_SIZE)
      setOffset(pageOffset + newRuns.length)
    } catch (err) {
      console.error('useCommunityFeed error:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    loadPage(0, true)
  }, [loadPage])

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) loadPage(offset, false)
  }, [loadPage, loadingMore, hasMore, offset])

  const refresh = useCallback(() => {
    setOffset(0)
    setHasMore(true)
    loadPage(0, true)
  }, [loadPage])

  return { runs, prsMap, shoesMap, loading, loadingMore, hasMore, loadMore, refresh }
}
