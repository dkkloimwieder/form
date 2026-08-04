/**
 * Merges objects together while keeping their getters alive.
 * Taken from SolidJS: {https://github.com/solidjs/solid/blob/24abc825c0996fd2bc8c1de1491efe9a7e743aff/packages/solid/src/server/rendering.ts#L82-L115}
 *
 * Vendored instead of importing `mergeProps` from `solid-js` because Solid 2
 * renames `mergeProps` to `merge` and changes its semantics: a present-but-
 * `undefined` value overrides earlier sources instead of being skipped. The
 * difference is one line of each proxy's `get` trap — Solid 1 asks whether the
 * source produced a VALUE, Solid 2 asks whether it declares the KEY:
 *
 *     if (v !== undefined) return v     // solid-js 1.x mergeProps
 *     if (property in s) return s[property]   // @solidjs/signals 2.x merge
 *
 * Both merge sites in `createFormHook.tsx` have the same shape — declared
 * defaults first, then caller-supplied JSX props — so under `merge` the
 * ubiquitous wrapper pattern silently erases a declared default:
 *
 *     withForm({ props: { title: 'Default' }, render })
 *
 * rendered as `<Child title={maybeTitle()} />` where the accessor returns
 * `undefined` yields `title === undefined`, not `'Default'`. Solid 2 also ships
 * the new semantics under the OLD name `mergeProps` in `@solidjs/web`, so
 * nothing in this package may import either binding from either module.
 *
 * The guard below tests KEY definedness rather than VALUE definedness, so it
 * never evaluates a getter while deciding — resolving one here would defeat the
 * lazy reads this merge exists to preserve.
 *
 * One deliberate difference from Solid 1's `mergeProps`: a key whose only
 * descriptors are plain values of `undefined` is left off the result entirely
 * instead of being defined as an `undefined`-yielding property. A later object
 * spread would otherwise re-apply that `undefined` over a default even though
 * every merge along the way skipped it.
 * */
export function mergeObjects<T>(source: T): T
export function mergeObjects<T, U>(source: T, source1: U): T & U
export function mergeObjects<T, U, V>(
  source: T,
  source1: U,
  source2: V,
): T & U & V
export function mergeObjects<T, U, V, W>(
  source: T,
  source1: U,
  source2: V,
  source3: W,
): T & U & V & W
export function mergeObjects(...sources: any): any {
  const target = {}
  for (let source of sources) {
    if (typeof source === 'function') source = source()
    if (source) {
      const descriptors = Object.getOwnPropertyDescriptors(source)
      for (const key in descriptors) {
        if (key in target) continue
        if (!isKeyDefined(sources, key)) continue
        Object.defineProperty(target, key, {
          enumerable: true,
          get() {
            for (let i = sources.length - 1; i >= 0; i--) {
              let v,
                s = sources[i]
              if (typeof s === 'function') s = s()
              // eslint-disable-next-line prefer-const
              v = (s || {})[key]
              if (v !== undefined) return v
            }
          },
        })
      }
    }
  }
  return target
}

/**
 * Reports whether any source can contribute a value for `key`.
 *
 * A getter or a function source always counts, because resolving either one
 * here would defeat the lazy reads this merge exists to preserve; a plain
 * `undefined` value never counts.
 */
function isKeyDefined(sources: Array<any>, key: string): boolean {
  for (let i = sources.length - 1; i >= 0; i--) {
    const s = sources[i]
    if (!s) continue
    if (typeof s === 'function') return true
    const descriptor = Object.getOwnPropertyDescriptor(s, key)
    if (!descriptor) continue
    if (descriptor.get || descriptor.value !== undefined) return true
  }
  return false
}
