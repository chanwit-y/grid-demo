import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import {
  captureGridItemRects,
  playGridFlipAnimation,
  type GridItemRectSnapshot,
} from './gridAnimation'

export function useGridFlipAnimation(): {
  gridRef: RefObject<HTMLDivElement | null>
  captureSnapshot: () => void
  scheduleAnimation: (changedItemId?: string | 'all') => void
} {
  const gridRef = useRef<HTMLDivElement>(null)
  const snapshotRef = useRef<GridItemRectSnapshot>(new Map())
  const contentFadeIdRef = useRef<string | 'all' | undefined>(undefined)
  const [animTick, setAnimTick] = useState(0)
  const isFirstRender = useRef(true)

  const captureSnapshot = useCallback(() => {
    if (gridRef.current) {
      snapshotRef.current = captureGridItemRects(gridRef.current)
    }
  }, [])

  const scheduleAnimation = useCallback((changedItemId?: string | 'all') => {
    contentFadeIdRef.current = changedItemId
    setAnimTick((t) => t + 1)
  }, [])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const container = gridRef.current
    if (!container) return
    playGridFlipAnimation(container, snapshotRef.current, contentFadeIdRef.current)
  }, [animTick])

  return { gridRef, captureSnapshot, scheduleAnimation }
}
