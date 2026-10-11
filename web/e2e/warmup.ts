import fs from 'node:fs'
import path from 'node:path'

/**
 * Utviklingsserveren kompilerer (React Compiler) hver fil ved første besøk, og med mange tester samtidig
 * tar det over 5 s per verktøy. Her hentes alle kildefilene én gang før testene starter
 * (ikke src/test: testoppsettet ville fått Vite til å optimalisere på nytt og laste sidene om igjen).
 */
export default async function warmup() {
  const root = path.resolve(import.meta.dirname, '../src')
  const files: string[] = []
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) {
        if (e.name !== 'test') walk(p)
      } else if (/\.(tsx?|css)$/.test(e.name) && !/\.(test\.tsx?|d\.ts)$/.test(e.name)) files.push(path.relative(root, p).split(path.sep).join('/'))
    }
  }
  walk(root)
  const queue = [...files]
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let f = queue.shift(); f; f = queue.shift()) await fetch(`http://localhost:5180/app/src/${f}`).then((r) => r.arrayBuffer())
    }),
  )
}
