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
  setItems: React.Dispatch<React.SetStateAction<GridItemData[]>>
}

export function useGridItemMove({ setItems }: UseGridItemMoveOptions) {
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

      // dnd-kit already animates the items to their preview slots during the
      // drag and lands the dragged item via the DragOverlay drop animation, so
      // we only commit the new order here. Running the custom FLIP animation on
      // top of that would re-animate every item and fight with dnd-kit.
      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id)
        const newIndex = prev.findIndex((i) => i.id === over.id)
        if (oldIndex === -1 || newIndex === -1) return prev
        return arrayMove(prev, oldIndex, newIndex)
      })
    },
    [setItems],
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
