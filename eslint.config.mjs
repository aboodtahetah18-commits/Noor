import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,

  // Repository/build artifacts are not source code.
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'coverage/**',
    'dist/**',
    '*.tsbuildinfo'
  ]),

  // The codebase contains legacy integration/repository adapters that still use
  // explicit `any`. Do not make those historical areas a release blocker.
  // The strict architectural layers remain protected below.
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },

  // IMPLEMENTATION_PLAN §9: unjustified `any` is forbidden in the authoritative
  // Domain / Financial Engine / Application layers.
  {
    files: [
      'src/domain/**/*.{ts,tsx}',
      'src/financial-engine/**/*.{ts,tsx}',
      'src/application/**/*.{ts,tsx}'
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error'
    }
  }
]);
