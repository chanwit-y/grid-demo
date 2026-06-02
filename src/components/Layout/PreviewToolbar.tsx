import { Code, Plus, Settings } from 'lucide-react'
import { cn, IconButton } from '../common'
import { BREAKPOINTS, type Breakpoint } from './breakpoints'

type PreviewToolbarProps = {
  previewBreakpoint: Breakpoint
  containerActive: boolean
  codeActive: boolean
  onSelectBreakpoint: (bp: Breakpoint) => void
  onOpenContainerSettings: (rect: DOMRect) => void
  onAddItem: () => void
  onOpenCode: (rect: DOMRect) => void
}

export function PreviewToolbar({
  previewBreakpoint,
  containerActive,
  codeActive,
  onSelectBreakpoint,
  onOpenContainerSettings,
  onAddItem,
  onOpenCode,
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
            className={cn(
              'rounded px-2 py-1 text-xs font-medium transition-colors',
              previewBreakpoint === bp.key
                ? 'bg-violet-600 text-white'
                : 'text-zinc-600 hover:bg-white',
            )}
          >
            {bp.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
        <IconButton
          label="Grid container settings"
          active={containerActive}
          className="h-8! w-8! border-0 bg-transparent shadow-none"
          onClick={(e) => {
            e.stopPropagation()
            onOpenContainerSettings(e.currentTarget.getBoundingClientRect())
          }}
        >
          <Settings size={18} aria-hidden="true" />
        </IconButton>
        <IconButton
          label="View component config (JSON / CSS)"
          active={codeActive}
          className="h-8! w-8! border-0 bg-transparent shadow-none"
          onClick={(e) => {
            e.stopPropagation()
            onOpenCode(e.currentTarget.getBoundingClientRect())
          }}
        >
          <Code size={18} aria-hidden="true" />
        </IconButton>
        <IconButton
          label="Add grid item"
          variant="primary"
          className="h-8! w-8! shadow-none"
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
