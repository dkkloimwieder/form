import { For, untrack } from 'solid-js'
import { useStore } from '@tanstack/solid-form'
import { useFieldContext } from '../hooks/form-context.tsx'

export default function TextField(props: { label: string }) {
  const field = useFieldContext<string>()

  // `untrack`: the FieldApi identity is stable for the life of the field, so
  // reading `.store` off it once is correct — the selector below stays live.
  // Without it Solid reports the component-body read as [STRICT_READ_UNTRACKED],
  // one per rendered field.
  const errors = useStore(
    untrack(() => field().store),
    (state) => state.meta.errors,
  )

  return (
    <div>
      <label>
        <div>{props.label}</div>
        <input
          value={field().state.value}
          onChange={(e) => field().handleChange(e.target.value)}
        />
      </label>
      <For each={errors()}>
        {(error) => <div style={{ color: 'red' }}>{error}</div>}
      </For>
    </div>
  )
}
