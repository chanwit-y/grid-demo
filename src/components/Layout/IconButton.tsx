import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  variant?: 'default' | 'primary'
  active?: boolean
  children: ReactNode
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, variant = 'default', active = false, children, className, ...rest },
    ref,
  ) {
    const variants = {
      default: active
        ? 'border-violet-500 bg-violet-50 text-violet-700'
        : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900',
      primary:
        'border-violet-600 bg-violet-600 text-white hover:bg-violet-700 hover:border-violet-700',
    }

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={[
          'inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors',
          variants[variant],
          className ?? '',
        ].join(' ')}
        {...rest}
      >
        {children}
      </button>
    )
  },
)
