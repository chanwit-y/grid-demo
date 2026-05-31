import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useCallback, useState } from 'react'
import type { GridItemData } from './types'

type UseGridItemMoveOptions = {
  applyLayoutChange: (update: () => void, changedItemId?: string | 'all') => void
  setItems: React.Dispatch<React.SetStateAction<GridItemData[]>>
}

export function useGridItemMove({
  applyLayoutChange,
  setItems,
}: UseGridItemMoveOptions) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over || active.id === over.id) return

      applyLayoutChange(() => {
        setItems((prev) => {
          const oldIndex = prev.findIndex((i) => i.id === active.id)
          const newIndex = prev.findIndex((i) => i.id === over.id)
          if (oldIndex === -1 || newIndex === -1) return prev
          return arrayMove(prev, oldIndex, newIndex)
        })
      }, 'all')
    },
    [applyLayoutChange, setItems],
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  return {
    sensors,
    activeId,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  }
}
