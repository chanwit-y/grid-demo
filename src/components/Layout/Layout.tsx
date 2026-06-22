import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable'
import { LayoutGrid } from 'lucide-react'
import {
  memo,
  Profiler,
  useCallback,
  useEffect,
  useId,
  useMemo,
  type ProfilerOnRenderCallback,
} from 'react'
import { CodeViewer, Popover } from '../common'
import { BREAKPOINTS } from './breakpoints'
import { SMOOTH_EASING } from './gridAnimation'
import { gridConfigToJson } from './gridConfig'
import { GridItemMemo, GridItemOverlay } from './GridItem'
import { useActiveItem, useGridStore, useSelectedItem } from './gridStore'
import { generateGridStyles } from './gridStyles'
import { PreviewToolbar } from './PreviewToolbar'
import { ContainerSettingsPanel, ItemSettingsPanel } from './SettingsPanel'
import type { GridItemData } from './types'
import { useGridFlipAnimation } from './useGridFlipAnimation'
import { escapeClassName } from './utils'

// Dev-only commit logger. No-op in prod (the <Profiler> below is unconditional,
// but React strips Profiler overhead from production builds).
const onRenderCommit: ProfilerOnRenderCallback = (_id, phase, actualDuration) => {
  if (import.meta.env.DEV) {
    console.debug(`[perf] commit (${phase}): ${actualDuration.toFixed(2)}ms`)
  }
}

// Memoized grid item so unchanged items skip re-render when the canvas
// re-renders (see GridCanvas note for why this alone isn't sufficient).
const ItemComponent = GridItemMemo

type GridCanvasProps = {
  sortableIds: string[]
  items: GridItemData[]
  selectedItemId: string | null
  activeItem: GridItemData | null
  layoutId: string
  gridRef: React.RefObject<HTMLDivElement | null>
  onDragStart: (e: DragStartEvent) => void
  onDragEnd: (e: DragEndEvent) => void
  onDragCancel: () => void
  onCanvasClick: () => void
}

/**
 * The dnd-kit subtree. Extracted and memoized (fix #2, part 3) so it does NOT
 * re-render when only `previewBreakpoint` / popover / code-panel state changes
 * — those don't appear in its props. Without this, any Layout re-render
 * re-creates DndContext's context value and forces all `useSortable` items to
 * re-render, which is why `memo(GridItem)` alone did nothing.
 */
function GridCanvasInner({
  sortableIds,
  items,
  selectedItemId,
  activeItem,
  layoutId,
  gridRef,
  onDragStart,
  onDragEnd,
  onDragCancel,
  onCanvasClick,
}: GridCanvasProps) {
  // Sensors live here (not a prop) so an unstable sensor array from the parent
  // can't defeat the memo on this component.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
        <div
          ref={gridRef}
          className={`gl-${layoutId} w-full rounded-lg border border-zinc-200 bg-white p-4 shadow-sm`}
          onClick={onCanvasClick}
        >
          {items.length === 0 ? (
            <div className="col-span-full flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 text-sm text-zinc-500">
              <LayoutGrid className="h-6 w-6 text-zinc-400" aria-hidden="true" />
              No grid items yet. Use the + button to add one.
            </div>
          ) : (
            items.map((item) => (
              <ItemComponent
                key={item.id}
                item={item}
                isSelected={selectedItemId === item.id}
              />
            ))
          )}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={{ duration: 220, easing: SMOOTH_EASING }}>
        {activeItem ? <GridItemOverlay item={activeItem} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

const GridCanvas = memo(GridCanvasInner)

export function Layout() {
  const layoutId = escapeClassName(useId())

  const items = useGridStore((s) => s.items)
  const containerSettings = useGridStore((s) => s.containerSettings)
  const previewBreakpoint = useGridStore((s) => s.previewBreakpoint)
  const popoverAnchor = useGridStore((s) => s.popoverAnchor)
  const settingsTarget = useGridStore((s) => s.settingsTarget)
  const selectedItemId = useGridStore((s) => s.selectedItemId)

  const setActiveId = useGridStore((s) => s.setActiveId)
  const moveItem = useGridStore((s) => s.moveItem)
  const closePopover = useGridStore((s) => s.closePopover)
  const setAnimator = useGridStore((s) => s.setAnimator)

  const selectedItem = useSelectedItem()
  const activeItem = useActiveItem()

  // FLIP animation lives in React (DOM refs + effects); register its callbacks
  // with the store so data actions can animate layout changes.
  const { gridRef, frameRef, captureSnapshot, scheduleAnimation } = useGridFlipAnimation()
  useEffect(() => {
    setAnimator({ capture: captureSnapshot, schedule: scheduleAnimation })
    return () => setAnimator(null)
  }, [setAnimator, captureSnapshot, scheduleAnimation])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => setActiveId(String(event.active.id)),
    [setActiveId],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over || active.id === over.id) return
      moveItem(String(active.id), String(over.id))
    },
    [setActiveId, moveItem],
  )

  const handleDragCancel = useCallback(() => setActiveId(null), [setActiveId])

  const gridCss = useMemo(
    () => generateGridStyles(layoutId, containerSettings, items, previewBreakpoint),
    [layoutId, containerSettings, items, previewBreakpoint],
  )

  // Stable id array for SortableContext. Without this, a fresh
  // `items.map(i => i.id)` every render changes the dnd-kit context value and
  // forces every `useSortable` consumer to re-render. Keyed on the id
  // *sequence*, so it only changes on add/remove/reorder, not on per-item
  // settings edits.
  const idSequence = items.map((i) => i.id).join(',')
  const sortableIds = useMemo(
    () => idSequence.split(',').filter(Boolean),
    [idSequence],
  )

  // The JSON config and full responsive CSS are only shown in the code panel,
  // so only build them when it's open — otherwise every edit pays to serialize
  // the whole config and regenerate the full stylesheet for nothing.
  const computeCode = settingsTarget === 'code'

  const gridConfigJson = useMemo(
    () => (computeCode ? gridConfigToJson(containerSettings, items) : ''),
    [computeCode, containerSettings, items],
  )

  const fullGridCss = useMemo(
    () => (computeCode ? generateGridStyles(layoutId, containerSettings, items) : ''),
    [computeCode, layoutId, containerSettings, items],
  )

  const previewWidth = BREAKPOINTS.find((b) => b.key === previewBreakpoint)?.previewWidth

  return (
    <Profiler id="grid" onRender={onRenderCommit}>
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50">
      <style dangerouslySetInnerHTML={{ __html: gridCss }} />

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="mx-auto flex min-h-0 w-full flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100/80">
            <PreviewToolbar />

            <div
              className="flex min-h-0 flex-1 flex-col items-center p-4"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(113,113,122,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(113,113,122,0.12) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            >
              <div
                ref={frameRef}
                className="mx-auto w-full max-w-full rounded-lg"
                style={{ width: previewWidth ?? '100%' }}
              >
                <GridCanvas
                  sortableIds={sortableIds}
                  items={items}
                  selectedItemId={selectedItemId}
                  activeItem={activeItem}
                  layoutId={layoutId}
                  gridRef={gridRef}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                  onCanvasClick={closePopover}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Popover
        anchor={popoverAnchor}
        title={
          settingsTarget === 'container'
            ? 'Grid container (12-col max)'
            : settingsTarget === 'code'
              ? 'Component config'
              : `Grid item: ${selectedItem?.label ?? 'Settings'}`
        }
        onClose={closePopover}
      >
        {settingsTarget === 'container' && <ContainerSettingsPanel />}
        {settingsTarget === 'item' && selectedItem && <ItemSettingsPanel />}
        {settingsTarget === 'code' && (
          <CodeViewer
            maxHeightClassName="max-h-96"
            tabs={[
              { id: 'json', label: 'JSON config', language: 'json', code: gridConfigJson },
              { id: 'css', label: 'CSS', language: 'css', code: fullGridCss },
            ]}
          />
        )}
      </Popover>
    </div>
    </Profiler>
  )
}
