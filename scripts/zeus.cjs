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

if (args[0] === '--native' || !['build', 'preview', 'dev'].includes(args[0])) {
  if (args[0] === '--native') process.argv.splice(2, 1)
  // Local Zeus 1.9.3 otherwise discovers the host package's aliases.
  require('module-alias')({ base: cli })
  require(path.join(cli, 'bin/main.js'))
} else {
  const stage = require('./zeus-stage.cjs').createStage(project)
  const watchers =
    args[0] === 'dev'
      ? stage.runtime.map((name) =>
          fs.watch(path.join(project, name), { recursive: true }, () =>
            stage.sync(name),
          ),
        )
      : []
  const child = spawn(process.execPath, [__filename, '--native', ...args], {
    cwd: stage.directory,
    stdio: 'inherit',
  })
  child.on('error', (error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  child.on('close', (code) => {
    watchers.forEach((watcher) => watcher.close())
    try {
      const output = path.join(stage.directory, 'dist')
      if (args[0] === 'build' && code === 0) {
        const hasPackage =
          fs.existsSync(output) &&
          fs
            .readdirSync(output, { recursive: true })
            .some((name) => name.endsWith('.zab'))
        if (!hasPackage)
          throw new Error('Zeus did not produce an installable package.')
        fs.cpSync(output, path.join(project, 'dist'), { recursive: true })
      }
    } catch (error) {
      console.error(error.message)
      process.exitCode = 1
    } finally {
      if (!stage.dispose())
        console.warn(
          `Windows is still holding a temporary folder: ${stage.directory}. The next run will use a different folder.`,
        )
    }
    // Preserve a missing-package/spawn failure even if Zeus returned success.
    if (!process.exitCode) process.exitCode = code ?? 1
  })
}
