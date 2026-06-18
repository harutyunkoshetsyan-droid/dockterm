import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vitest/config'

/** Handles Vite's `?raw` import suffix in the vitest (Node) environment.
 *  Returns the file path as a stub string so mascot art comparisons work. */
function rawSvgPlugin(): Plugin {
  return {
    name: 'raw-svg',
    resolveId(id) {
      if (id.endsWith('?raw')) return '\0raw:' + id.slice(0, -4)
      return null
    },
    load(id) {
      if (id.startsWith('\0raw:')) {
        const filePath = id.slice(5)
        return `export default ${JSON.stringify(filePath)}`
      }
      return null
    }
  }
}

export default defineConfig({
  plugins: [rawSvgPlugin()],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    pool: 'forks',
    testTimeout: 20000
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@main': resolve(__dirname, 'src/main'),
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  }
})
