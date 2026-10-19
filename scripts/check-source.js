import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

let checked = 0
for (const directory of [
  'shared',
  'page',
  'app-side',
  'app-widget',
  'setting',
]) {
  for (const file of readdirSync(directory).filter((file) =>
    file.endsWith('.js'),
  )) {
    const result = spawnSync(
      process.execPath,
      ['--check', `${directory}/${file}`],
      { encoding: 'utf8' },
    )
    if (result.status !== 0) throw new Error(result.stderr)
    checked++
  }
}
console.log(`Syntax checked ${checked} application modules.`)
