import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

export default defineConfig([
  ...nextVitals,
  {
    // These two React hooks rules arrived with eslint-config-next 16, after this code
    // was written. They are warnings in the files that break them today, and errors
    // everywhere else. Remove a file from this list when it is fixed.
    files: [
      'src/app/dashboard/DashboardView.tsx',
      'src/app/municipalities/MunicipalityExplorer.tsx',
      'src/app/updates/UpdatesLog.tsx',
      'src/components/charts/StatChart.tsx',
      'src/components/layout/HeaderSearch.tsx',
    ],
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts', 'public/**']),
])
