> [!IMPORTANT]
> **This example is parked for the SolidJS 2 transition and is excluded from the
> pnpm workspace.** It is not installed, built, or type-checked by the repo's
> gates. The source stays in-tree and the example is expected to come back
> unchanged once its dependencies ship a Solid 2 line.
>
> **Why it cannot simply be migrated.** It depends on
> `@tanstack/solid-form-devtools`, which depends on `@tanstack/form-devtools` —
> both Solid 1 source. The whole TanStack devtools family (`@tanstack/devtools`,
> `-ui`, `-utils`, `@tanstack/solid-devtools`) declares `solid-js: >=1.9.7` and
> has no Solid 2 release line, so the fix is not available in this repository.
> Running a Solid 1 island inside a Solid 2 app is not an option either:
> `vite-plugin-solid@3` enforces a single Solid runtime by design, and two
> copies of `@solidjs/web` would mean two template caches and two
> delegated-event roots.
>
> **Running it anyway.** The example works against the last Solid 1 release of
> the adapter. Outside the workspace:
>
> ```bash
> cp -r examples/solid/devtools /tmp/solid-form-devtools-example
> cd /tmp/solid-form-devtools-example
> # drop the workspace: protocol, which only resolves inside this monorepo
> npm pkg set dependencies.@tanstack/solid-form-devtools=^0.2.32
> npm install   # @tanstack/solid-form@^1.33.3 pulls the Solid 1 build
> npm run dev
> ```
>
> Un-parking is tracked as bead `form-8zl.2`.

## Usage

```bash
$ npm install # or pnpm install or yarn install
```

### Learn more on the [Solid Website](https://solidjs.com) and come chat with us on our [Discord](https://discord.com/invite/solidjs)

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in the development mode.<br>
Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

### `npm run build`

Builds the app for production to the `dist` folder.<br>
It correctly bundles Solid in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

## Deployment

Learn more about deploying your application with the [documentations](https://vitejs.dev/guide/static-deploy.html)
