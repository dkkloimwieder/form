// @ts-check

import rootConfig from '../../eslint.config.js'

export default [
  ...rootConfig,
  {
    files: ['src/**'],
    rules: {
      // Solid 2 treats the effect half's return value as a cleanup slot, and an
      // expression-bodied arrow leaks its expression's value into it. The two
      // builds then disagree, which is why this is a lint rule and not a test:
      // dev throws at effect creation, and since a render effect's effect half
      // runs synchronously during setup the throw escapes render() and leaves
      // the reactive system permanently halted; prod does not check at all, so
      // the value is stored and invoked later as a cleanup, surfacing as a
      // TypeError far from the line that caused it. Pinned in
      // tests/solid2-effect-half.test.tsx.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.name=/^create(Render)?Effect$/][arguments.1.type='ArrowFunctionExpression'][arguments.1.body.type!='BlockStatement']",
          message:
            'Effect halves must be braced blocks returning undefined or a cleanup function: an expression-bodied arrow leaks its value into the cleanup slot, which throws at creation in dev (halting the reactive system) and is silently mis-stored in prod.',
        },
      ],
    },
  },
]
