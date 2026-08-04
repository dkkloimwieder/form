/* @refresh reload */
import { render } from '@solidjs/web'

import { createForm } from '@tanstack/solid-form'
import { For, Show } from 'solid-js'

function App() {
  const form = createForm(() => ({
    defaultValues: {
      people: [] as Array<{ age: number; name: string }>,
    },
    onSubmit: ({ value }) => alert(JSON.stringify(value)),
  }))

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
      >
        <form.Field name="people" mode="array">
          {(field) => (
            <div>
              <Show when={field().state.value.length > 0}>
                {/* Must stay non-keyed: with the default keyed={true} the row
                    remounts on every value change and the test fails.
                    `keyed={false}` is the Solid 1 `<Index>` this replaces. */}
                <For each={field().state.value} keyed={false}>
                  {(_, i) => (
                    <form.Field name={`people[${i}].name`}>
                      {(subField) => (
                        <div>
                          <label>
                            <div>Name for person {i}</div>
                            <input
                              value={subField().state.value}
                              onInput={(e) => {
                                subField().handleChange(e.currentTarget.value)
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </form.Field>
                  )}
                </For>
              </Show>

              <button
                onClick={() => field().pushValue({ name: '', age: 0 })}
                type="button"
              >
                Add person
              </button>
            </div>
          )}
        </form.Field>
        <button type="submit">Submit</button>
      </form>
    </div>
  )
}

const root = document.getElementById('root')

render(() => <App />, root!)
