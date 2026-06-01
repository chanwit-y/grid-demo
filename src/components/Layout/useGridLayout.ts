import { useCallback, useState } from 'react'
import type { Breakpoint } from './breakpoints'
import { updateContainerBreakpoint, updateItemBreakpoint } from './gridSettings'
import { useGridFlipAnimation } from './useGridFlipAnimation'
import { useGridItemMove } from './useGridItemMove'
import {
  createDefaultItemSettings,
  defaultContainerSettings,
  type GridContainerSettings,
  type GridItemData,
} from './types'

function createId(): string {
  return crypto.randomUUID()
}

function createInitialItems(): GridItemData[] {
  return [
    { id: createId(), label: 'Item 1', settings: createDefaultItemSettings() },
    {
      id: createId(),
      label: 'Item 2',
      settings: createDefaultItemSettings({
        colSpan: { xs: 4, sm: 6, md: 4, lg: 4 },
      }),
    },
  ]
}

/**
 * Owns the grid's data (items + container settings) and wires every mutation
 * through the FLIP animation so layout changes animate smoothly. UI selection
 * state (popover, selected item, preview breakpoint) stays in the component.
 */
export function useGridLayout() {
  const [items, setItems] = useState<GridItemData[]>(createInitialItems)
  const [containerSettings, setContainerSettings] =
    useState<GridContainerSettings>(defaultContainerSettings)

  const { gridRef, frameRef, captureSnapshot, scheduleAnimation } =
    useGridFlipAnimation()

  const applyLayoutChange = useCallback(
    (update: () => void, changedItemId?: string | 'all') => {
      captureSnapshot()
      update()
      scheduleAnimation(changedItemId)
    },
    [captureSnapshot, scheduleAnimation],
  )

  const { sensors, activeId, handleDragStart, handleDragEnd, handleDragCancel } =
    useGridItemMove({ setItems })

  const addItem = useCallback(() => {
    const bpCols = containerSettings.columns
    applyLayoutChange(() => {
      setItems((prev) => [
        ...prev,
        {
          id: createId(),
          label: `Item ${prev.length + 1}`,
          settings: createDefaultItemSettings({
            colSpan: {
              xs: bpCols.xs,
              sm: Math.min(3, bpCols.sm),
              md: Math.min(2, bpCols.md),
              lg: Math.min(2, bpCols.lg),
            },
          }),
        },
      ])
    })
  }, [applyLayoutChange, containerSettings.columns])

  const removeItem = useCallback(
    (id: string) => {
      applyLayoutChange(() => {
        setItems((prev) => prev.filter((i) => i.id !== id))
      })
    },
    [applyLayoutChange],
  )

  const updateContainer = useCallback(
    (bp: Breakpoint, key: string, value: string) => {
      applyLayoutChange(() => {
        setContainerSettings((prev) => updateContainerBreakpoint(prev, bp, key, value))
      }, 'all')
    },
    [applyLayoutChange],
  )

  const updateItem = useCallback(
    (id: string, bp: Breakpoint, key: string, value: string) => {
      applyLayoutChange(() => {
        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, settings: updateItemBreakpoint(item.settings, bp, key, value) }
              : item,
          ),
        )
      }, id)
    },
    [applyLayoutChange],
  )

  const updateItemLabel = useCallback((id: string, label: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, label } : item)))
  }, [])

  // Run an arbitrary state change (e.g. switching the preview breakpoint) inside
  // a FLIP animation so every item transitions to its new position.
  const animateLayout = useCallback(
    (apply: () => void) => {
      captureSnapshot()
      apply()
      scheduleAnimation('all')
    },
    [captureSnapshot, scheduleAnimation],
  )

  return {
    items,
    containerSettings,
    gridRef,
    frameRef,
    sensors,
    activeId,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    addItem,
    removeItem,
    updateContainer,
    updateItem,
    updateItemLabel,
    animateLayout,
  }
}
