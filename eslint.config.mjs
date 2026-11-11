import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

export default defineConfig([
  ...nextVitals,
  {
    // New in eslint-plugin-react-hooks 6, which arrived with eslint-config-next 16.
    // The existing code was written before these rules existed. They stay visible as
    // warnings until each place is fixed, then go back to errors.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'public/**']),
])
