import type { PropertyField } from './gridProperties'

type PropertyFormProps<T extends Record<string, string>> = {
  title: string
  fields: PropertyField[]
  values: T
  onChange: (key: keyof T & string, value: string) => void
}

export function PropertyForm<T extends Record<string, string>>({
  title,
  fields,
  values,
  onChange,
}: PropertyFormProps<T>) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      <div className="space-y-2.5">
        {fields.map((field) => (
          <label
            key={field.key}
            className="block space-y-1"
          >
            <span className="font-mono text-xs text-zinc-600">{field.label}</span>
            {field.type === 'select' ? (
              <select
                value={values[field.key] ?? ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              >
                {(field.options ?? []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={values[field.key] ?? ''}
                placeholder={field.placeholder}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 font-mono text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
            )}
            {field.hint ? (
              <span className="block text-xs text-zinc-400">{field.hint}</span>
            ) : null}
          </label>
        ))}
      </div>
    </div>
  )
}
