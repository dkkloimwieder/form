import { flush } from 'solid-js'

/**
 * Drains the Solid 2 reactive queue.
 *
 * Solid 2 defers every update to a microtask, so a test that reads a value
 * imperatively in the same synchronous tick as a write sees the previous one.
 * Reads from JSX, memos and effect compute halves need nothing — they re-run
 * when the graph settles.
 *
 * Idempotent, and close to free when the queue is empty.
 *
 * MUST NOT be called from inside `onSettled` or `createTrackedEffect`
 * callbacks: `flush()` is not reentrant there and throws. From an ordinary
 * effect callback it does not throw but is a silent no-op, so it cannot settle
 * reads there either.
 *
 * ---
 *
 * WHERE THIS IS AND IS NOT NEEDED, measured on the whole suite (form-f8y.2).
 *
 * The migrated suites call this ZERO times, and that is the finding, not an
 * oversight. All 44 tests pass without it, including every one of the shapes
 * the port expected to break: a closure variable written by an async
 * `onSubmit`, an imperative read of a signal written inside a mount validator,
 * and `toHaveBeenCalledTimes` on an effect after `await user.click`.
 *
 * The reason is that both of the suite's entry points already settle.
 * `@solidjs/web`'s `render()` flushes before returning, and user-event's
 * `wait()` is `setTimeout`-backed — a macrotask, which drains Solid's pending
 * `queueMicrotask(flush)` before the next assertion runs.
 *
 * So the rule is: `settle()` is for a write issued DIRECTLY BY THE TEST BODY,
 * which is why only the semantic contract suite uses it. If you are reaching
 * for it after `await user.*`, the failure is almost certainly something else.
 * Do not add it speculatively — a `settle()` that guards nothing is a false
 * claim about the timing contract.
 */
export function settle(): void {
  flush()
}
