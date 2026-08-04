/**
 * Reads every own enumerable property of `options` so that options supplied as
 * getters (`{ get defaultValue() { return signal() } }`) register as
 * dependencies of the surrounding tracked scope.
 *
 * Solid 2 splits effects into a tracked compute half and an untracked effect
 * half. `api.update(options)` belongs in the effect half — it is imperative —
 * but form-core reads the option properties there, where reads subscribe to
 * nothing. Without this the options-push loop runs once and then never again,
 * and Solid's dev build reports it only as `[STRICT_READ_UNTRACKED]`.
 *
 * The spread result is discarded on purpose: `api.update` still receives the
 * ORIGINAL object, so form-core's later reads keep hitting the caller's live
 * getters exactly as they did under Solid 1.
 */
export function trackOptions<T>(options: T): T {
  if (options !== null && typeof options === 'object') void { ...options }
  return options
}
