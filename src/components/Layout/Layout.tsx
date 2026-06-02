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
import { useCallback, useEffect, useId, useMemo } from 'react'
import { CodeViewer, Popover } from '../common'
import { BREAKPOINTS } from './breakpoints'
import { SMOOTH_EASING } from './gridAnimation'
import { gridConfigToJson } from './gridConfig'
import { GridItem, GridItemOverlay } from './GridItem'
import { useActiveItem, useGridStore, useSelectedItem } from './gridStore'
import { generateGridStyles } from './gridStyles'
import { PreviewToolbar } from './PreviewToolbar'
import { ContainerSettingsPanel, ItemSettingsPanel } from './SettingsPanel'
import { useGridFlipAnimation } from './useGridFlipAnimation'
import { escapeClassName } from './utils'

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )

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

  const gridConfigJson = useMemo(
    () => gridConfigToJson(containerSettings, items),
    [containerSettings, items],
  )

  const fullGridCss = useMemo(
    () => generateGridStyles(layoutId, containerSettings, items),
    [layoutId, containerSettings, items],
  )

  const previewWidth = BREAKPOINTS.find((b) => b.key === previewBreakpoint)?.previewWidth

  return (
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                >
                  <SortableContext
                    items={items.map((i) => i.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div
                      ref={gridRef}
                      className={`gl-${layoutId} w-full rounded-lg border border-zinc-200 bg-white p-4 shadow-sm`}
                      onClick={closePopover}
                    >
                      {items.length === 0 ? (
                        <div className="col-span-full flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 text-sm text-zinc-500">
                          <LayoutGrid className="h-6 w-6 text-zinc-400" aria-hidden="true" />
                          No grid items yet. Use the + button to add one.
                        </div>
                      ) : (
                        items.map((item) => (
                          <GridItem
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
  )
}
