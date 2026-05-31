import { MAX_GRID_COLUMNS, type Breakpoint } from './breakpoints'
import { containerResponsiveFields, itemResponsiveFields } from './gridProperties'
import { ResponsivePropertyForm } from './ResponsivePropertyForm'
import type { GridContainerSettings, GridItemData } from './types'

export function ContainerSettingsPanel({
  settings,
  onChange,
}: {
  settings: GridContainerSettings
  onChange: (bp: Breakpoint, key: string, value: string) => void
}) {
  return (
    <ResponsivePropertyForm
      title="Container per breakpoint"
      fields={containerResponsiveFields}
      values={settings}
      maxColumns={MAX_GRID_COLUMNS}
      onChange={onChange}
    />
  )
}

export function ItemSettingsPanel({
  item,
  previewBreakpoint,
  onChangeLabel,
  onChangeSetting,
  onRemove,
}: {
  item: GridItemData
  previewBreakpoint: Breakpoint
  onChangeLabel: (label: string) => void
  onChangeSetting: (bp: Breakpoint, key: string, value: string) => void
  onRemove: () => void
}) {
  return (
    <div className="space-y-4">
      <label className="block space-y-1">
        <span className="text-xs font-medium text-zinc-600">Label</span>
        <input
          type="text"
          value={item.label}
          onChange={(e) => onChangeLabel(e.target.value)}
          className="w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
        />
      </label>
      <ResponsivePropertyForm
        title="Item per breakpoint"
        fields={itemResponsiveFields}
        defaultBreakpoint={previewBreakpoint}
        values={item.settings}
        maxColumns={MAX_GRID_COLUMNS}
        onChange={onChangeSetting}
      />
      <button
        type="button"
        onClick={onRemove}
        className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
      >
        Remove item
      </button>
    </div>
  )
}
