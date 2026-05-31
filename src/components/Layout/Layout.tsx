import { closestCenter, DndContext, DragOverlay } from '@dnd-kit/core'
import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable'
import { useCallback, useId, useMemo, useState } from 'react'
import { BREAKPOINTS, clampColumns, clampSpan, MAX_GRID_COLUMNS, type Breakpoint } from './breakpoints'
import {
  containerResponsiveFields,
  itemResponsiveFields,
} from './gridProperties'
import { generateGridStyles } from './gridStyles'
import { SMOOTH_DURATION_MS, SMOOTH_EASING } from './gridAnimation'
import { useGridFlipAnimation } from './useGridFlipAnimation'
import { useGridItemMove } from './useGridItemMove'
import { GridItem, GridItemOverlay } from './GridItem'
import { LayoutGrid, Plus, Settings } from 'lucide-react'
import { IconButton } from './IconButton'
import { Popover } from './Popover'
import { ResponsivePropertyForm } from './ResponsivePropertyForm'
import {
  createDefaultItemSettings,
  defaultContainerSettings,
  type GridContainerSettings,
  type GridItemData,
  type GridItemSettings,
} from './types'

function createId() {
  return crypto.randomUUID()
}

function escapeLayoutId(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_')
}

const NUMERIC_CONTAINER_KEYS = new Set(['columns'])
const NUMERIC_ITEM_KEYS = new Set(['colSpan', 'colStart', 'rowSpan'])

function updateContainerBreakpoint(
  prev: GridContainerSettings,
  bp: Breakpoint,
  key: string,
  value: string,
): GridContainerSettings {
  const field = prev[key as keyof GridContainerSettings]
  if (!field || typeof field !== 'object') return prev

  if (NUMERIC_CONTAINER_KEYS.has(key)) {
    return {
      ...prev,
      columns: {
        ...prev.columns,
        [bp]: clampColumns(Number(value)),
      },
    }
  }

  return {
    ...prev,
    [key]: {
      ...(field as Record<Breakpoint, string>),
      [bp]: value,
    },
  } as GridContainerSettings
}

function updateItemBreakpoint(
  prev: GridItemSettings,
  bp: Breakpoint,
  key: string,
  value: string,
): GridItemSettings {
  const field = prev[key as keyof GridItemSettings]
  if (!field || typeof field !== 'object') return prev

  if (NUMERIC_ITEM_KEYS.has(key)) {
    const num = Number(value)
    if (key === 'colStart') {
      return {
        ...prev,
        colStart: { ...prev.colStart, [bp]: Math.max(0, num) },
      }
    }
    if (key === 'colSpan') {
      return {
        ...prev,
        colSpan: { ...prev.colSpan, [bp]: clampSpan(num, MAX_GRID_COLUMNS) },
      }
    }
    if (key === 'rowSpan') {
      return {
        ...prev,
        rowSpan: { ...prev.rowSpan, [bp]: Math.max(1, num) },
      }
    }
  }

  return {
    ...prev,
    [key]: {
      ...(field as Record<Breakpoint, string>),
      [bp]: value,
    },
  } as GridItemSettings
}

export function Layout() {
  const reactId = useId()
  const layoutId = escapeLayoutId(reactId)

  const [items, setItems] = useState<GridItemData[]>([
    {
      id: createId(),
      label: 'Item 1',
      settings: createDefaultItemSettings(),
    },
    {
      id: createId(),
      label: 'Item 2',
      settings: createDefaultItemSettings({
        colSpan: { xs: 4, sm: 6, md: 4, lg: 4 },
      }),
    },
  ])
  const [containerSettings, setContainerSettings] =
    useState<GridContainerSettings>(defaultContainerSettings)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null)
  const [settingsTarget, setSettingsTarget] = useState<'item' | 'container' | null>(
    null,
  )
  const [previewBreakpoint, setPreviewBreakpoint] = useState<Breakpoint>('lg')
  const selectedItem = items.find((i) => i.id === selectedItemId)

  const { gridRef, captureSnapshot, scheduleAnimation } = useGridFlipAnimation()

  const applyLayoutChange = useCallback(
    (update: () => void, changedItemId?: string | 'all') => {
      captureSnapshot()
      update()
      scheduleAnimation(changedItemId)
    },
    [captureSnapshot, scheduleAnimation],
  )

  const {
    sensors,
    activeId,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  } = useGridItemMove({
    applyLayoutChange,
    setItems,
  })

  const activeItem = activeId
    ? items.find((i) => i.id === activeId) ?? null
    : null

  const gridCss = useMemo(
    () => generateGridStyles(layoutId, containerSettings, items, previewBreakpoint),
    [layoutId, containerSettings, items, previewBreakpoint],
  )

  const previewWidth = BREAKPOINTS.find((b) => b.key === previewBreakpoint)?.previewWidth

  const closePopover = useCallback(() => {
    setPopoverAnchor(null)
    setSettingsTarget(null)
  }, [])

  const openContainerSettings = (rect: DOMRect) => {
    setSelectedItemId(null)
    setSettingsTarget('container')
    setPopoverAnchor(rect)
  }

  const openItemSettings = (id: string, rect: DOMRect) => {
    setSelectedItemId(id)
    setSettingsTarget('item')
    setPopoverAnchor(rect)
  }

  const addItem = () => {
    const nextIndex = items.length + 1
    const bpCols = containerSettings.columns
    applyLayoutChange(() => {
      setItems((prev) => [
        ...prev,
        {
          id: createId(),
          label: `Item ${nextIndex}`,
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
  }

  const removeSelectedItem = () => {
    if (!selectedItemId) return
    const removedId = selectedItemId
    applyLayoutChange(() => {
      setItems((prev) => prev.filter((i) => i.id !== removedId))
    })
    closePopover()
    setSelectedItemId(null)
  }

  const updateContainer = (bp: Breakpoint, key: string, value: string) => {
    applyLayoutChange(() => {
      setContainerSettings((prev) => updateContainerBreakpoint(prev, bp, key, value))
    }, 'all')
  }

  const updateItem = (bp: Breakpoint, key: string, value: string) => {
    if (!selectedItemId) return
    const itemId = selectedItemId
    applyLayoutChange(() => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                settings: updateItemBreakpoint(
                  item.settings,
                  bp,
                  key,
                  value,
                ),
              }
            : item,
        ),
      )
    }, itemId)
  }

  const updateItemLabel = (label: string) => {
    if (!selectedItemId) return
    const itemId = selectedItemId
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, label } : item)),
    )
  }

  const containerFormValues = {
    columns: containerSettings.columns,
    gap: containerSettings.gap,
    rowGap: containerSettings.rowGap,
    columnGap: containerSettings.columnGap,
    justifyItems: containerSettings.justifyItems,
    alignItems: containerSettings.alignItems,
    justifyContent: containerSettings.justifyContent,
    alignContent: containerSettings.alignContent,
    gridAutoRows: containerSettings.gridAutoRows,
    gridAutoFlow: containerSettings.gridAutoFlow,
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50">
      <style dangerouslySetInnerHTML={{ __html: gridCss }} />

      <header className="flex shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3">
        <h1 className="text-base font-semibold text-zinc-900">12-Column Grid</h1>
        <p className="text-xs text-zinc-500">Responsive: xs · sm · md · lg (max 12 cols)</p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="mx-auto flex min-h-0 w-full flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100/80">
            <div className="relative flex shrink-0 items-center justify-end gap-2 border-b border-zinc-200 bg-white/70 px-3 py-2">
              <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
                <span className="px-1.5 text-xs font-medium text-zinc-500">Preview</span>
                {BREAKPOINTS.map((bp) => (
                  <button
                    key={bp.key}
                    type="button"
                    onClick={() => {
                      captureSnapshot()
                      setPreviewBreakpoint(bp.key)
                      scheduleAnimation('all')
                    }}
                    className={[
                      'rounded px-2 py-1 text-xs font-medium transition-colors',
                      previewBreakpoint === bp.key
                        ? 'bg-violet-600 text-white'
                        : 'text-zinc-600 hover:bg-white',
                    ].join(' ')}
                  >
                    {bp.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <IconButton
                  label="Grid container settings"
                  active={settingsTarget === 'container'}
                  onClick={(e) => {
                    e.stopPropagation()
                    openContainerSettings(e.currentTarget.getBoundingClientRect())
                  }}
                >
                  <Settings size={18} aria-hidden="true" />
                </IconButton>
                <IconButton
                  label="Add grid item"
                  variant="primary"
                  onClick={(e) => {
                    e.stopPropagation()
                    addItem()
                  }}
                >
                  <Plus size={18} aria-hidden="true" />
                </IconButton>
              </div>
            </div>

            <div
              className="flex min-h-0 flex-1 flex-col items-center p-4"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(113,113,122,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(113,113,122,0.12) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            >
              <div
                className="mx-auto w-full max-w-full"
                style={{
                  width: previewWidth ?? '100%',
                  transition: `width ${SMOOTH_DURATION_MS}ms ${SMOOTH_EASING}`,
                }}
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
                  items.map((item, index) => (
                    <GridItem
                      key={item.id}
                      item={item}
                      itemClassName={`gi-${item.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`}
                      index={index}
                      isSelected={selectedItemId === item.id}
                      onSelect={openItemSettings}
                    />
                  ))
                )}
              </div>
              </SortableContext>
              <DragOverlay
                dropAnimation={{ duration: 220, easing: SMOOTH_EASING }}
              >
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
            : `Grid item: ${selectedItem?.label ?? 'Settings'}`
        }
        onClose={closePopover}
      >
        {settingsTarget === 'container' && (
          <ResponsivePropertyForm
            title="Container per breakpoint"
            fields={containerResponsiveFields}
            values={containerFormValues}
            maxColumns={12}
            onChange={updateContainer}
          />
        )}
        {settingsTarget === 'item' && selectedItem && (
          <div className="space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-zinc-600">Label</span>
              <input
                type="text"
                value={selectedItem.label}
                onChange={(e) => updateItemLabel(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
            </label>
            <ResponsivePropertyForm
              title="Item per breakpoint"
              fields={itemResponsiveFields}
              defaultBreakpoint={previewBreakpoint}
              values={{
                colSpan: selectedItem.settings.colSpan,
                colStart: selectedItem.settings.colStart,
                rowSpan: selectedItem.settings.rowSpan,
                gridColumn: selectedItem.settings.gridColumn,
                gridRow: selectedItem.settings.gridRow,
                gridArea: selectedItem.settings.gridArea,
                justifySelf: selectedItem.settings.justifySelf,
                alignSelf: selectedItem.settings.alignSelf,
                order: selectedItem.settings.order,
              }}
              maxColumns={MAX_GRID_COLUMNS}
              onChange={updateItem}
            />
            <button
              type="button"
              onClick={removeSelectedItem}
              className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Remove item
            </button>
          </div>
        )}
      </Popover>
    </div>
  )
}
