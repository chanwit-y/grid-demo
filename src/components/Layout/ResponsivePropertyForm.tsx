import { useState } from 'react'
import { cn } from '../common'
import { BREAKPOINTS, MAX_GRID_COLUMNS, type Breakpoint } from './breakpoints'
import { BREAKPOINT_LABELS, type PropertyField } from './gridProperties'
import type { Responsive } from './types'

function ColumnSpanButtons({
  value,
  max,
  onSelect,
}: {
  value: string
  max: number
  onSelect: (span: string) => void
}) {
  const limit = Math.min(MAX_GRID_COLUMNS, Math.max(1, max))
  const selected = value ? Number(value) : null

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Column span">
      {Array.from({ length: limit }, (_, i) => {
        const n = i + 1
        const isActive = selected === n
        return (
          <button
            key={n}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(String(n))}
            className={cn(
              'min-w-[2.25rem] rounded-md border px-2 py-1.5 font-mono text-xs font-semibold transition-colors',
              isActive
                ? 'border-violet-600 bg-violet-600 text-white shadow-sm'
                : 'border-zinc-300 bg-white text-zinc-700 hover:border-violet-400 hover:bg-violet-50',
            )}
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}

type ResponsiveValues = Record<string, Responsive<string | number>>

type ResponsivePropertyFormProps = {
  title: string
  fields: PropertyField[]
  values: ResponsiveValues
  maxColumns?: number
  getMaxColumns?: (breakpoint: Breakpoint) => number
  defaultBreakpoint?: Breakpoint
  onChange: (
    breakpoint: Breakpoint,
    key: string,
    value: string,
    animate?: boolean,
  ) => void
}

/**
 * Discrete controls (selects, span buttons) commit once per interaction, so
 * they animate. Free-text inputs fire per keystroke, so they update without a
 * FLIP (fix #3) and let CSS transitions smooth the change.
 */
function fieldAnimates(field: PropertyField): boolean {
  return (
    field.type === 'select' ||
    field.type === 'number-select' ||
    field.type === 'span-buttons'
  )
}

export function ResponsivePropertyForm({
  title,
  fields,
  values,
  maxColumns = 12,
  getMaxColumns,
  defaultBreakpoint = 'xs',
  onChange,
}: ResponsivePropertyFormProps) {
  const [activeBp, setActiveBp] = useState<Breakpoint>(defaultBreakpoint)

  const columnLimit = getMaxColumns?.(activeBp) ?? maxColumns

  const getOptionsForField = (field: PropertyField) => {
    if (field.key === 'columns' || field.key === 'colSpan') {
      const max = Math.min(columnLimit, field.max ?? 12)
      return Array.from({ length: max }, (_, i) => {
        const n = String(i + 1)
        return { value: n, label: n }
      })
    }
    if (field.key === 'colStart') {
      const max = Math.min(columnLimit, 12)
      return [
        { value: '0', label: 'auto' },
        ...Array.from({ length: max }, (_, i) => {
          const n = String(i + 1)
          return { value: n, label: n }
        }),
      ]
    }
    return field.options ?? []
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>

      <div className="flex flex-wrap gap-1 rounded-lg bg-zinc-100 p-1">
        {BREAKPOINTS.map((bp) => (
          <button
            key={bp.key}
            type="button"
            onClick={() => setActiveBp(bp.key)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
              activeBp === bp.key
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-zinc-600 hover:bg-white hover:text-zinc-900',
            )}
          >
            {bp.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-zinc-500">{BREAKPOINT_LABELS[activeBp]}</p>

      <div className="space-y-2.5">
        {fields.map((field) => {
          const fieldValues = values[field.key]
          const rawValue = fieldValues?.[activeBp]
          const value =
            rawValue === undefined || rawValue === null ? '' : String(rawValue)

          return (
            <label key={`${field.key}-${activeBp}`} className="block space-y-1">
              <span className="font-mono text-xs text-zinc-600">
                {field.label}
                <span className="ml-1 text-violet-600">@{activeBp}</span>
              </span>
              {field.type === 'span-buttons' ? (
                <ColumnSpanButtons
                  value={value}
                  max={Math.min(columnLimit, field.max ?? MAX_GRID_COLUMNS)}
                  onSelect={(span) =>
                    onChange(activeBp, field.key, span, fieldAnimates(field))
                  }
                />
              ) : field.type === 'select' || field.type === 'number-select' ? (
                <select
                  value={value}
                  onChange={(e) =>
                    onChange(activeBp, field.key, e.target.value, fieldAnimates(field))
                  }
                  className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                >
                  {(getOptionsForField(field) ?? []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={value}
                  placeholder={field.placeholder}
                  onChange={(e) =>
                    onChange(activeBp, field.key, e.target.value, fieldAnimates(field))
                  }
                  className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 font-mono text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              )}
              {field.hint ? (
                <span className="block text-xs text-zinc-400">{field.hint}</span>
              ) : null}
            </label>
          )
        })}
      </div>
    </div>
  )
}
