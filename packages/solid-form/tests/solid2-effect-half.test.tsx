import { describe, expect, it } from 'vitest'
import { render } from '@solidjs/testing-library'
import { createRenderEffect, createSignal } from 'solid-js'
import { settle } from './utils/reactive'

/**
 * The contract behind packages/solid-form/eslint.config.js's
 * `no-restricted-syntax` rule, which forbids expression-bodied effect halves
 * across `src/**`.
 *
 * In Solid 2 an effect's SECOND argument runs untracked and its RETURN VALUE is
 * the cleanup slot. A concise-bodied arrow returns its expression implicitly,
 * so the trap is a one-character difference:
 *
 *     createRenderEffect(() => sig(), (v) => api.update(v))     // leaks a value
 *     createRenderEffect(() => sig(), (v) => { api.update(v) }) // returns undefined
 *
 * WHAT ACTUALLY HAPPENS — measured on @solidjs/signals 2.0.0-beta.30, because
 * the two builds disagree and only one of them is loud:
 *
 *   dev  — `runEffect` validates the returned value and THROWS immediately,
 *          `<name> callback returned an invalid cleanup value.` A render
 *          effect's effect half runs synchronously at creation, so this fires
 *          during component setup and propagates straight out of `render()`.
 *          The escaped throw then halts the reactive system for the rest of the
 *          module, which is what the last test here pins.
 *   prod — there is no check at all. The value is stored as the node's cleanup
 *          and invoked on the effect's NEXT run or at disposal, where it
 *          surfaces as `TypeError: x is not a function` at a point in time
 *          unrelated to the line that caused it.
 *
 * That divergence is the whole argument for a lint rule rather than a test: the
 * mistake is invisible in the build where it does the damage, and by the time
 * it is visible the stack no longer names the effect that leaked.
 *
 * ISOLATED ON PURPOSE — do not merge this into solid2-semantics.test.tsx. The
 * halt asserted below is module-wide and permanent, so colocating these would
 * silently break every test declared after them. Test order in this file is
 * load-bearing for the same reason: the positive control runs FIRST, while the
 * graph is still alive.
 */
describe('Solid 2 effect-half return guard', () => {
  it('accepts undefined and a cleanup function, which is what a braced body returns', () => {
    const [count, setCount] = createSignal(0)
    const seen: Array<number> = []
    const cleaned: Array<number> = []

    createRenderEffect(
      () => count(),
      (value) => {
        seen.push(value)
        return () => {
          cleaned.push(value)
        }
      },
    )
    createRenderEffect(
      () => count(),
      () => {},
    )

    setCount(1)
    settle()

    // Still live: the effect re-ran, and the previous run's cleanup fired.
    expect(seen).toEqual([0, 1])
    expect(cleaned).toEqual([0])
  })

  it('throws at creation when the effect half returns a non-function', () => {
    const [count] = createSignal(0)
    const seen: Array<number> = []

    expect(() =>
      createRenderEffect(
        () => count(),
        // The exact shape the lint rule forbids: `push` returns the new length,
        // and that number lands in the cleanup slot.
        (value) => seen.push(value) as never,
      ),
    ).toThrow(/callback returned an invalid cleanup value/)

    // The half itself ran to completion first — the value is rejected after the
    // side effect, not instead of it. So the damage is a half-applied update.
    expect(seen).toEqual([0])
  })

  it('takes the whole component down when it happens during render', () => {
    const [count] = createSignal(0)

    function Comp() {
      createRenderEffect(
        () => count(),
        (value) => value as never,
      )
      return <div>never reached</div>
    }

    // Not a caught render error and not a fallback: it propagates out of
    // render() to the caller, because a render effect's effect half runs
    // synchronously inside the component body.
    expect(() => render(() => <Comp />)).toThrow(
      /callback returned an invalid cleanup value/,
    )
  })

  it('leaves the reactive system permanently halted afterwards', () => {
    // This is the severity claim, and why one bad arrow anywhere in src/ is not
    // a local bug. Nothing here is broken on its own — the effect below is
    // perfectly well formed — but the graph is already dead from the throws
    // above, so its update is simply dropped.
    //
    // Asserted through console.error rather than DEV.diagnostics: the halt is
    // emitted as a structured diagnostic exactly ONCE, when the uncaught error
    // first escapes (two tests ago). Every dropped update afterwards is only a
    // console.error — which is precisely what makes this cheap to miss.
    const errors: Array<string> = []
    const restore = console.error
    console.error = (...args: Array<unknown>) => {
      errors.push(args.map(String).join(' '))
    }

    const [count, setCount] = createSignal(0)
    const seen: Array<number> = []

    try {
      createRenderEffect(
        () => count(),
        (value) => {
          seen.push(value)
        },
      )

      setCount(1)
      settle()
    } finally {
      console.error = restore
    }

    expect(errors.join('\n')).toMatch(/\[REACTIVITY_HALTED\] Update ignored/)
    // The effect half never delivers the 1: updates stop, silently.
    expect(seen).not.toContain(1)
  })
})
