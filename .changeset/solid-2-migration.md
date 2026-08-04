---
'@tanstack/solid-form': major
---

Migrate to SolidJS 2.

`@tanstack/solid-form` now targets `solid-js` 2.x and no longer supports Solid 1. The form logic is unchanged — `@tanstack/form-core` is framework-agnostic — but the reactivity glue was rewritten against Solid 2's split effects, and five of those changes are visible to consumers.

### 1. Solid 1 is no longer supported

The peer range is now `>=2.0.0-beta.30 <3.0.0`. Stay on `@tanstack/solid-form` 1.x if you are on Solid 1.

### 2. `@solidjs/web` is a new required peer

Solid 2 moved the DOM runtime out of `solid-js/web` into its own package, and `solid-js` 2.x no longer exposes a `./web` subpath at all.

```diff
  {
    "dependencies": {
+     "@solidjs/web": "2.0.0-beta.30",
      "solid-js": "2.0.0-beta.30"
    }
  }
```

```diff
- import { render } from 'solid-js/web'
+ import { render } from '@solidjs/web'
```

Keep the two on the same version, and make sure `@solidjs/web` resolves to **exactly one** copy. It owns the template cache and the delegated-event root; two copies means two of each, and events fired in one tree are invisible to the other. This is why we ship it as a peer rather than a dependency.

Set `"jsxImportSource": "@solidjs/web"` in your `tsconfig.json`, and use `vite-plugin-solid` 3.x.

### 3. Imperative reads are no longer synchronous

Solid 2 settles every update on a microtask, so a `form.useSelector(...)` or `field().state` read in the same synchronous tick as a write returns the **previous** value.

```ts
form.setFieldValue('name', 'Jane')
selected() // still the old value
await Promise.resolve()
selected() // 'Jane'
```

Reads from JSX, memos and effect compute functions are unaffected — they re-run when the graph settles — so components generally need no changes. In practice this shows up in tests and in the occasional event handler that reads back what it just wrote. Awaiting one microtask, or `flush()` from `solid-js`, is enough.

### 4. `fieldGroup.Subscribe` children receive an accessor

This matches `form.Subscribe`, which already passed one.

```diff
  <group.Subscribe selector={(state) => state.values.lastName}>
-   {(lastName) => <p>{lastName}</p>}
+   {(lastName) => <p>{lastName()}</p>}
  </group.Subscribe>
```

The old value form was a latent staleness bug rather than a working API: `createComponent` runs component bodies untracked — in Solid 1 too — so the child received a value frozen at first render and never updated. **The break is silent for JavaScript consumers**: `{lastName}` renders `"function ..."` instead of failing. TypeScript users get a compile error.

### 5. `FormApi.mount()`'s cleanup now runs on unmount

Solid 1's `onMount` discarded the cleanup that `mount()` returns, so the devtools listeners and the throttled store subscription leaked for the lifetime of the page. `onSettled` now registers it. This is a behaviour change, not only a fix: anything relying on a form's subscriptions outliving its component will stop working.

### Also: `<Index>` is gone

This is Solid's break rather than ours, but you will hit it in your own code. Use `<For each={…} keyed={false}>`, whose callback shape — `(item: Accessor<T>, index: number)` — is identical to `<Index>`'s, so it is an element rename plus one prop. The default `<For>` is keyed and hands you the raw row instead.

`Suspense` is likewise renamed to `Loading`.

### Notes

- **The TypeScript floor is unchanged at 5.4.** Solid 2's `.d.ts` files were checked against the full 5.4 → 5.9 matrix and the error sets are byte-identical, so no supported TypeScript version was dropped.
- **This changeset will not trigger a release from this repository.** `.github/workflows/release.yml` gates the release job on `github.repository_owner == 'TanStack'`, so neither `changeset version` nor `changeset publish` runs on a fork. It is here as a durable, machine-readable record of the break that travels with the branch.
- `.changeset/config.json` puts `@tanstack/solid-form` in a `fixed` group with `form-core` and eight other adapters, so a `major` here would lockstep-bump all nine if this were ever released as-is. That is deliberately left alone: editing the `fixed` array would buy nothing here and would add rebase-conflict surface on a file upstream owns.
