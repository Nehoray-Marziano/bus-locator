// Zeus scans every JS file under its project root. Give it a runtime-only staging
// directory so tests, tools and screenshots never enter the watch package.
const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')
const args = process.argv.slice(2)
const project = fs.realpathSync(path.join(__dirname, '..'))
const localNpm = path.join(project, '.tooling', 'shims')
if (fs.existsSync(path.join(localNpm, 'npm.cmd'))) {
  process.env.PATH = localNpm + path.delimiter + process.env.PATH
}
const cli = path.dirname(require.resolve('@zeppos/zeus-cli/package.json'))
const runtime = [
  'app.js',
  'app.json',
  'package.json',
  'page',
  'shared',
  'app-side',
  'app-widget',
  'setting',
  'assets',
]

if (args[0] === '--native' || !['build', 'preview', 'dev'].includes(args[0])) {
  if (args[0] === '--native') process.argv.splice(2, 1)
  // Local Zeus 1.9.3 otherwise discovers the host package's aliases.
  require('module-alias')({ base: cli })
  require(path.join(cli, 'bin/main.js'))
} else {
  const stage = path.join(project, '.tooling', 'watch')
  if (!stage.startsWith(project + path.sep))
    throw new Error('Invalid staging path')
  if (fs.existsSync(stage)) {
    if (
      fs.lstatSync(stage).isSymbolicLink() ||
      !fs.realpathSync(stage).startsWith(project + path.sep)
    )
      throw new Error('Staging path escaped workspace')
    fs.rmSync(stage, { recursive: true, force: true })
  }
  fs.mkdirSync(stage, { recursive: true })
  const copy = (name) =>
    fs.cpSync(path.join(project, name), path.join(stage, name), {
      recursive: true,
    })
  runtime.forEach(copy)
  fs.writeFileSync(path.join(stage, '.gitignore'), 'node_modules/\ndist/\n')
  fs.symlinkSync(
    fs.realpathSync(path.join(project, 'node_modules')),
    path.join(stage, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  )
  const watchers =
    args[0] === 'dev'
      ? runtime.map((name) =>
          fs.watch(path.join(project, name), { recursive: true }, () =>
            copy(name),
          ),
        )
      : []
  const child = spawn(process.execPath, [__filename, '--native', ...args], {
    cwd: stage,
    stdio: 'inherit',
  })
  child.on('error', (error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  child.on('exit', (code) => {
    watchers.forEach((watcher) => watcher.close())
    const output = path.join(stage, 'dist')
    if (args[0] === 'build') {
      const hasPackage =
        fs.existsSync(output) &&
        fs
          .readdirSync(output, { recursive: true })
          .some((name) => name.endsWith('.zab'))
      if (!hasPackage) {
        console.error('Zeus did not produce an installable package.')
        process.exitCode = 1
        return
      }
      fs.cpSync(output, path.join(project, 'dist'), { recursive: true })
    }
    process.exitCode = code ?? 1
  })
}
