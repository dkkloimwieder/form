import { For, Show, untrack } from 'solid-js'
import { useStore } from '@tanstack/solid-form'
import { useFieldContext } from '../hooks/form-context.tsx'

export default function TextField(props: { label: string }) {
  const field = useFieldContext<string>()

  // `untrack`: the FieldApi identity is stable for the life of the field, so
  // reading `.store` off it once is correct — the selectors below stay live.
  // Without it Solid reports the component-body read as [STRICT_READ_UNTRACKED],
  // one per rendered field.
  const store = untrack(() => field().store)
  const errors = useStore(store, (state) => state.meta.errors)
  const isTouched = useStore(store, (state) => state.meta.isTouched)

  return (
    <div>
      <label>
        <div>{props.label}</div>
        <input
          value={field().state.value}
          onChange={(e) => field().handleChange(e.target.value)}
        />
      </label>
      {/*
        Only surface errors once the user has visited this field.

        This form declares a FORM-level onChange validator returning an
        `errors.fields` map, and form-core runs it on ANY field change and
        distributes the result to every named field. Ungated, a single keystroke
        in Full Name lit up "required" on Phone and on both Emergency Contact
        fields at once, none of which the user had touched.

        `isTouched` flips on the first change — setFieldValue updates meta — and
        on submit, so nothing the user needs to see stays hidden. This matches
        the `isTouched && !isValid` convention the simple and standard-schema
        examples already use.
      */}
      <Show when={isTouched()}>
        <For each={errors()}>
          {(error) => <div style={{ color: 'red' }}>{error}</div>}
        </For>
      </Show>
    </div>
  )
}
