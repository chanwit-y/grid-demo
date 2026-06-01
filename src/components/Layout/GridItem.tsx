import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Settings } from 'lucide-react'
import { IconButton } from './IconButton'
import type { GridItemData } from './types'

type GridItemProps = {
  item: GridItemData
  itemClassName: string
  isSelected: boolean
  onSelect: (id: string, rect: DOMRect) => void
}

export function GridItem({
  item,
  itemClassName,
  isSelected,
  onSelect,
}: GridItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-grid-item={item.id}
      onClick={(e) => {
        e.stopPropagation()
      }}
      className={[
        itemClassName,
        // Let the CSS grid (and `grid-row: span N`) control height. Keep a
        // sensible single-row minimum to match the default `grid-auto-rows`.
        'grid-item-cell group relative flex min-h-14 touch-none items-center justify-center rounded-lg border-2 p-2',
        'transition-[border-color,background-color,box-shadow,opacity] duration-200 ease-out',
        isDragging
          ? 'z-0 border-dashed border-violet-300 bg-violet-50/40 opacity-40'
          : isOver
            ? 'border-dashed border-violet-400 bg-violet-50 shadow-sm ring-2 ring-violet-300/60'
            : isSelected
              ? 'border-dashed border-violet-500 bg-violet-50 ring-2 ring-violet-500/30'
              : 'border-dashed border-zinc-300 bg-white hover:border-violet-400 hover:bg-violet-50/50 hover:shadow-sm',
      ].join(' ')}
    >
      <IconButton
        ref={setActivatorNodeRef}
        label={`Move ${item.label}`}
        className="absolute left-1 top-1 z-10 h-6! w-6! cursor-grab rounded-md opacity-60 shadow-sm transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
      </IconButton>
      <IconButton
        label={`Adjust settings for ${item.label}`}
        active={isSelected}
        className="absolute right-1 top-1 z-10 h-6! w-6! rounded-md opacity-60 shadow-sm transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation()
          onSelect(item.id, e.currentTarget.getBoundingClientRect())
        }}
      >
        <Settings className="h-3.5 w-3.5" aria-hidden="true" />
      </IconButton>
      <div data-grid-item-content className="h-full w-full" />
    </div>
  )
}

export function GridItemOverlay({ item }: { item: GridItemData }) {
  return (
    <div className="relative flex h-14 w-full cursor-grabbing items-center justify-center rounded-lg border-2 border-solid border-violet-500 bg-white p-2 shadow-2xl shadow-violet-500/30 ring-2 ring-violet-400/50">
      <span className="absolute left-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-md border border-violet-500 bg-violet-50 text-violet-700 shadow-sm">
        <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <span className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 shadow-sm">
        <Settings className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <span className="text-xs font-medium text-zinc-400">{item.label}</span>
    </div>
  )
}
