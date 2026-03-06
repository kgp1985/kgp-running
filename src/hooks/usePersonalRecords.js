import { useLocalStorage } from './useLocalStorage.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'

export function usePersonalRecords() {
  const [prs, setPRs] = useLocalStorage(STORAGE_KEYS.PERSONAL_RECORDS, {})

  const setPR = (distanceLabel, time, date, raceName = '') => {
    setPRs(prev => ({
      ...prev,
      [distanceLabel]: { distanceLabel, time, date, raceName },
    }))
  }

  const deletePR = (distanceLabel) => {
    setPRs(prev => {
      const next = { ...prev }
      delete next[distanceLabel]
      return next
    })
  }

  const getPR = (distanceLabel) => prs[distanceLabel] ?? null

  /**
   * Check if a given run improves a PR for common distances and update if so.
   * @param {object} run - a run entry
   */
  const checkAndUpdatePR = (run) => {
    const distanceMap = [
      { label: '5K', miles: 5000 / 1609.344, tolerance: 0.05 },
      { label: '10K', miles: 10000 / 1609.344, tolerance: 0.05 },
      { label: 'Half Marathon', miles: 21097.5 / 1609.344, tolerance: 0.1 },
      { label: 'Marathon', miles: 42195 / 1609.344, tolerance: 0.2 },
      { label: '1 Mile', miles: 1, tolerance: 0.02 },
    ]
    // Use functional update to avoid stale closure on prs
    setPRs(prev => {
      let next = { ...prev }
      let changed = false
      distanceMap.forEach(({ label, miles, tolerance }) => {
        if (Math.abs(run.distance - miles) / miles <= tolerance) {
          const existing = next[label]
          if (!existing || run.duration < existing.time) {
            next[label] = { distanceLabel: label, time: run.duration, date: run.date, raceName: '' }
            changed = true
          }
        }
      })
      return changed ? next : prev
    })
  }

  return { prs, setPR, deletePR, getPR, checkAndUpdatePR }
}
