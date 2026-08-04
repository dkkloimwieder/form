import { describe, expect, it } from 'vitest'
import { render } from '@solidjs/testing-library'
import { formOptions } from '@tanstack/form-core'
import userEvent from '@testing-library/user-event'
import { DEV, createSignal } from 'solid-js'
import {
  createForm,
  createFormHook,
  createFormHookContexts,
} from '../src/index'
import { settle } from './utils/reactive'

const user = userEvent.setup()

/**
 * Contracts for the Solid 2 reactivity model that this adapter depends on,
 * pinned so a regression shows up as a failing assertion rather than as a
 * subtly stale value in a consumer's app.
 *
 * The type system catches NONE of these. Every one of them was, or would have
 * been, a silent failure: correct-looking code that renders once and then stops
 * updating. Each test is written so that reverting the specific fix it guards
 * makes it fail — a test that passes either way is worse than no test.
 *
 * The effect-half cleanup-slot contract lives in solid2-effect-half.test.tsx,
 * on its own, because asserting it halts the reactive system for the module.
 */

const { fieldContext, useFieldContext, formContext, useFormContext } =
  createFormHookContexts()

function TextField(props: { label: string }) {
  const field = useFieldContext<string>()
  return (
    <label>
      <div>{props.label}</div>
      <input
        value={field().state.value}
        onChange={(e) => field().handleChange(e.target.value)}
      />
    </label>
  )
}

function SubscribeButton(props: { label: string }) {
  const form = useFormContext()
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <button disabled={isSubmitting()}>{props.label}</button>
      )}
    </form.Subscribe>
  )
}

const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldComponents: { TextField },
  formComponents: { SubscribeButton },
  fieldContext,
  formContext,
})

describe('Solid 2 semantics', () => {
  it('keeps pushing options that are supplied as getters', () => {
    // GUARDS: trackOptions (src/reactivity.ts), finding M1.
    //
    // Solid 2 splits an effect into a tracked compute half and an UNTRACKED
    // effect half. `api.update(options)` belongs in the effect half, but
    // form-core reads the option properties there — where a read subscribes to
    // nothing. Without trackOptions touching every own enumerable property in
    // the compute half, this loop runs exactly once and every option is frozen
    // at first render, reported only as a dev-mode [STRICT_READ_UNTRACKED].
    //
    // Reverting trackOptions to `return options` makes this fail.
    const [name, setName] = createSignal('first')
    const pushed: Array<unknown> = []

    function GetterOptionsForm() {
      const form = createForm(() => ({
        get defaultValues() {
          return { name: name() }
        },
      }))

      const realUpdate = form.update.bind(form)
      form.update = ((options?: any) => {
        pushed.push(options?.defaultValues?.name)
        return realUpdate(options)
      }) as typeof form.update

      return <p>ok</p>
    }

    render(() => <GetterOptionsForm />)
    // Ignore whatever the seed run did; the claim is about SUBSEQUENT pushes.
    pushed.length = 0

    setName('second')
    settle()

    expect(pushed).toContain('second')
  })

  it('renders a form and its fields with no dev diagnostics', async () => {
    // GUARDS: `untrack(() => api.update(nextOptions))` in the effect half of
    // createForm/createField/createFormGroup.
    //
    // Three things had to be measured to make this discriminating rather than
    // decorative, and each one was a trap:
    //
    //  - Solid arms strict-read checking only inside createComponent, so the
    //    form must be built in a NAMED component.
    //  - The options must be REACTIVE — a getter over a signal, then actually
    //    changed. With a static options object nothing performs a reactive read
    //    at all, so the assertion passes with every untrack() deleted.
    //  - The count at construction is NOT zero and cannot be made zero. Seeding
    //    the FormApi calls the caller's getters from the component body, which
    //    is genuinely an untracked read, and Solid is right to say so. Wrapping
    //    the seed in untrack() does not change the number — verified, it is 4
    //    either way. `untrack` stops a read from SUBSCRIBING; it does not
    //    silence the diagnostic.
    //
    // So the honest contract is not "zero diagnostics" but "pushing new options
    // adds none": the irreducible construction reads are baselined, and the
    // update path must stay quiet. Removing the untrack around api.update takes
    // construction from 4 to 7 and adds 3 more per push, so this fails.
    const capture = DEV!.diagnostics.capture()
    const [firstName, setFirstName] = createSignal('John')
    const noisy = ['STRICT_READ_UNTRACKED', 'REACTIVE_WRITE_IN_OWNED_SCOPE']

    function DiagnosticsForm() {
      const form = useAppForm(() => ({
        get defaultValues() {
          return { firstName: firstName(), lastName: 'Doe' }
        },
      }))
      return (
        <div>
          <form.AppField name="firstName">
            {(field) => <field.TextField label="First Name" />}
          </form.AppField>
          <form.AppForm>
            <form.SubscribeButton label="Submit" />
          </form.AppForm>
        </div>
      )
    }

    const { getByLabelText } = render(() => <DiagnosticsForm />)
    const atConstruction = capture.events.filter((event) =>
      noisy.includes(event.code),
    ).length

    setFirstName('Jane')
    settle()
    await user.type(getByLabelText('First Name'), '!')

    const events = capture.stop()
    const added = events
      .filter((event) => noisy.includes(event.code))
      .slice(atConstruction)
      .map((event) => `${event.code}: ${event.message}`)

    expect(added).toEqual([])
    // A halt is never acceptable, at any point.
    expect(events.map((event) => event.code)).not.toContain('REACTIVITY_HALTED')
  })

  it('re-renders the field that changed and not its siblings', async () => {
    // GUARDS: makeFieldReactive's createMemo({ equals: false }), finding M3,
    // plus the fine-grained property from TanStack/form#1961.
    //
    // The memo returns the SAME FieldApi identity every time, so under Solid's
    // default reference equality it would notify exactly once, at creation, and
    // never again — `equals: false` is what makes it republish. Dropping that
    // option leaves the mirror below stuck at 'John'.
    //
    // The mirror is the load-bearing assertion, NOT the input: an input the
    // user typed into shows the new text whether or not anything reactive
    // happened, so asserting on it would pass either way. The mirror can only
    // change if the memo republished and the JSX expression re-ran.
    //
    // The second half is the #1961 property: republishing must stay scoped to
    // the field whose own slices moved. `reads.last` counts evaluations of the
    // sibling's JSX expression, not of its children callback — Solid invokes a
    // children callback once and re-runs only the reactive expressions inside
    // it, so counting callbacks would report 1 no matter what.
    const reads = { last: 0 }

    function TwoFieldForm() {
      const form = createForm(() => ({
        defaultValues: { firstName: 'John', lastName: 'Doe' },
      }))
      return (
        <div>
          <form.Field name="firstName">
            {(field) => (
              <>
                <label>
                  <div>First</div>
                  <input
                    value={field().state.value}
                    onInput={(e) => field().handleChange(e.currentTarget.value)}
                  />
                </label>
                <p data-testid="mirror">{field().state.value}</p>
              </>
            )}
          </form.Field>
          <form.Field name="lastName">
            {(field) => (
              <p data-testid="last">
                {(() => {
                  reads.last++
                  return field().state.value
                })()}
              </p>
            )}
          </form.Field>
        </div>
      )
    }

    const { getByTestId, getByLabelText } = render(() => <TwoFieldForm />)
    expect(getByTestId('mirror')).toHaveTextContent('John')
    const lastBefore = reads.last

    await user.type(getByLabelText('First'), 'ny')

    // The memo really did republish: a read that nothing typed into moved.
    expect(getByTestId('mirror')).toHaveTextContent('Johnny')
    // ...and the untouched sibling was left alone.
    expect(reads.last).toBe(lastBefore)
  })

  it('keeps a declared default that a present-but-undefined prop would erase', () => {
    // GUARDS: the choice of the vendored mergeObjects over Solid 2's `merge`.
    //
    // The two differ in one line of their get trap. Solid 1's mergeProps asked
    // whether a source produced a VALUE (`if (v !== undefined) return v`);
    // Solid 2's merge asks whether it declares the KEY
    // (`if (property in s) return s[property]`). Both merge sites in
    // createFormHook are declared-defaults-then-caller-props, so under `merge`
    // a caller prop that happens to be undefined erases the default instead of
    // falling through to it.
    //
    // Swapping mergeObjects for merge in createFormHook.tsx makes this fail
    // with 'Default' replaced by nothing.
    //
    // `title` is declared as `string | undefined` because that is the only
    // shape in which a consumer reaches this bug: the wrapper supplies a
    // default, and the JSX call site passes an accessor that is allowed to
    // return undefined. Declaring it as plain `string` would make TypeScript
    // reject the call site and the runtime hazard would never be reachable.
    const formOpts = formOptions({ defaultValues: { firstName: 'John' } })

    const ChildForm = withForm({
      ...formOpts,
      props: { title: 'Default' as string | undefined },
      render: ({ title }) => <p data-testid="title">{title}</p>,
    })

    function Parent() {
      const form = useAppForm(() => ({ ...formOpts }))
      const [title] = createSignal<string | undefined>(undefined)
      return <ChildForm form={form} title={title()} />
    }

    const { getByTestId } = render(() => <Parent />)
    expect(getByTestId('title')).toHaveTextContent('Default')
  })

  it('propagates a change through fieldGroup.Subscribe', async () => {
    // GUARDS: finding M5 — createFieldGroup.Subscribe now passes the ACCESSOR.
    //
    // It used to read `data()` eagerly in a component body, and component
    // bodies are untracked in Solid 1 as well, so the child received a value
    // frozen at first render. The pre-existing tests only ever asserted the
    // INITIAL value, so they passed while the bug was live. This one asserts a
    // change, which is the assertion that was missing.
    //
    // Reverting Subscribe to `functionalUpdate(props.children, data())` makes
    // this fail: 'Doe' stays on screen.
    const Group = withFieldGroup({
      defaultValues: { firstName: '', lastName: '' },
      render: ({ group }) => (
        <div>
          <group.Field name="lastName">
            {(field) => (
              <label>
                <div>Last</div>
                <input
                  value={field().state.value}
                  onInput={(e) => field().handleChange(e.currentTarget.value)}
                />
              </label>
            )}
          </group.Field>
          <group.Subscribe selector={(state) => state.values.lastName}>
            {(lastName) => <p data-testid="subscribed">{lastName()}</p>}
          </group.Subscribe>
        </div>
      ),
    })

    function Parent() {
      const form = useAppForm(() => ({
        defaultValues: { person: { firstName: 'John', lastName: 'Doe' } },
      }))
      return <Group form={form} fields="person" />
    }

    const { getByTestId, getByLabelText } = render(() => <Parent />)
    expect(getByTestId('subscribed')).toHaveTextContent('Doe')

    await user.clear(getByLabelText('Last'))
    await user.type(getByLabelText('Last'), 'Smith')

    expect(getByTestId('subscribed')).toHaveTextContent('Smith')
  })
})
