import { closestCenter, DndContext, DragOverlay } from '@dnd-kit/core'
import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable'
import { LayoutGrid } from 'lucide-react'
import { useCallback, useId, useMemo, useState } from 'react'
import { CodeViewer, Popover } from '../common'
import { BREAKPOINTS, type Breakpoint } from './breakpoints'
import { SMOOTH_EASING } from './gridAnimation'
import { gridConfigToJson } from './gridConfig'
import { GridItem, GridItemOverlay } from './GridItem'
import { generateGridStyles } from './gridStyles'
import { PreviewToolbar } from './PreviewToolbar'
import { ContainerSettingsPanel, ItemSettingsPanel } from './SettingsPanel'
import { useGridLayout } from './useGridLayout'
import { escapeClassName } from './utils'

type SettingsTarget = 'item' | 'container' | 'code' | null

export function Layout() {
  const layoutId = escapeClassName(useId())

  const {
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
  } = useGridLayout()

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null)
  const [settingsTarget, setSettingsTarget] = useState<SettingsTarget>(null)
  const [previewBreakpoint, setPreviewBreakpoint] = useState<Breakpoint>('lg')

  const selectedItem = items.find((i) => i.id === selectedItemId) ?? null
  const activeItem = activeId ? items.find((i) => i.id === activeId) ?? null : null

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

  const closePopover = useCallback(() => {
    setPopoverAnchor(null)
    setSettingsTarget(null)
  }, [])

  const openContainerSettings = useCallback((rect: DOMRect) => {
    setSelectedItemId(null)
    setSettingsTarget('container')
    setPopoverAnchor(rect)
  }, [])

  const openItemSettings = useCallback((id: string, rect: DOMRect) => {
    setSelectedItemId(id)
    setSettingsTarget('item')
    setPopoverAnchor(rect)
  }, [])

  const openCodePanel = useCallback((rect: DOMRect) => {
    setSelectedItemId(null)
    setSettingsTarget('code')
    setPopoverAnchor(rect)
  }, [])

  const handleRemoveItem = useCallback(() => {
    if (!selectedItemId) return
    removeItem(selectedItemId)
    setSelectedItemId(null)
    closePopover()
  }, [selectedItemId, removeItem, closePopover])

  const handleSelectBreakpoint = useCallback(
    (bp: Breakpoint) => {
      animateLayout(() => setPreviewBreakpoint(bp))
    },
    [animateLayout],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50">
      <style dangerouslySetInnerHTML={{ __html: gridCss }} />

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="mx-auto flex min-h-0 w-full flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100/80">
            <PreviewToolbar
              previewBreakpoint={previewBreakpoint}
              containerActive={settingsTarget === 'container'}
              codeActive={settingsTarget === 'code'}
              onSelectBreakpoint={handleSelectBreakpoint}
              onOpenContainerSettings={openContainerSettings}
              onAddItem={addItem}
              onOpenCode={openCodePanel}
            />

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
                            itemClassName={`gi-${escapeClassName(item.id)}`}
                            isSelected={selectedItemId === item.id}
                            onSelect={openItemSettings}
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
        {settingsTarget === 'container' && (
          <ContainerSettingsPanel settings={containerSettings} onChange={updateContainer} />
        )}
        {settingsTarget === 'item' && selectedItem && (
          <ItemSettingsPanel
            item={selectedItem}
            previewBreakpoint={previewBreakpoint}
            onChangeLabel={(label) => updateItemLabel(selectedItem.id, label)}
            onChangeSetting={(bp, key, value) => updateItem(selectedItem.id, bp, key, value)}
            onRemove={handleRemoveItem}
          />
        )}
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
