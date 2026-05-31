import { Plus, Settings } from 'lucide-react'
import { BREAKPOINTS, type Breakpoint } from './breakpoints'
import { IconButton } from './IconButton'

type PreviewToolbarProps = {
  previewBreakpoint: Breakpoint
  containerActive: boolean
  onSelectBreakpoint: (bp: Breakpoint) => void
  onOpenContainerSettings: (rect: DOMRect) => void
  onAddItem: () => void
}

export function PreviewToolbar({
  previewBreakpoint,
  containerActive,
  onSelectBreakpoint,
  onOpenContainerSettings,
  onAddItem,
}: PreviewToolbarProps) {
  return (
    <div className="relative flex shrink-0 items-center justify-end gap-2 border-b border-zinc-200 bg-white/70 px-3 py-2">
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
        <span className="px-1.5 text-xs font-medium text-zinc-500">Preview</span>
        {BREAKPOINTS.map((bp) => (
          <button
            key={bp.key}
            type="button"
            onClick={() => onSelectBreakpoint(bp.key)}
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
          active={containerActive}
          onClick={(e) => {
            e.stopPropagation()
            onOpenContainerSettings(e.currentTarget.getBoundingClientRect())
          }}
        >
          <Settings size={18} aria-hidden="true" />
        </IconButton>
        <IconButton
          label="Add grid item"
          variant="primary"
          onClick={(e) => {
            e.stopPropagation()
            onAddItem()
          }}
        >
          <Plus size={18} aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  )
}
