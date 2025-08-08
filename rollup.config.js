import commonjs from '@rollup/plugin-commonjs';
import del from 'rollup-plugin-delete';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import versionInjector from 'rollup-plugin-version-injector';

export default [
  // Library Configuration
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'lib/index.cjs',
        format: 'cjs',
        sourcemap: true,
        inlineDynamicImports: true,
      },
      {
        file: 'lib/index.esm.js',
        format: 'es',
        sourcemap: true,
        inlineDynamicImports: true,
      },
    ],
    plugins: [
      del({ targets: 'lib/*' }),
      json(),
      commonjs(),
      nodeResolve({ browser: false, preferBuiltins: true }),
      typescript({ useTsconfigDeclarationDir: true }),
    ],
  },

  // CLI Configuration
  {
    input: 'src/cli.ts',
    output: {
      file: 'lib/cli.js',
      format: 'es',
      sourcemap: true,
      banner: '#!/usr/bin/env node',
      inlineDynamicImports: true,
    },
    plugins: [
      commonjs(),
      json(),
      nodeResolve({ browser: false, preferBuiltins: true }),
      typescript({ useTsconfigDeclarationDir: true }),
      versionInjector({
        format: 'esm',
        injectInComments: false,
      }),
    ],
    external: ['fs', 'path'], // Mark Node.js built-ins as external
  },
];