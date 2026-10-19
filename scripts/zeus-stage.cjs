const fs = require('node:fs')
const path = require('node:path')

// Zeus scans its project directory. Only runtime inputs belong in that tree.
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

function isInside(parent, target) {
  const relative = path.relative(parent, target)
  return (
    relative &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  )
}

function createStage(project) {
  const root = fs.realpathSync(project)
  const tooling = path.join(root, '.tooling')
  fs.mkdirSync(tooling, { recursive: true })
  if (!isInside(root, fs.realpathSync(tooling)))
    throw new Error('Tooling path escaped workspace')
  const parent = path.join(tooling, 'runs')
  fs.mkdirSync(parent, { recursive: true })
  const resolvedParent = fs.realpathSync(parent)
  if (!isInside(root, resolvedParent))
    throw new Error('Staging path escaped workspace')

  // A dev session may still have its working directory open on Windows. Never
  // reuse or delete another invocation's folder (including legacy .tooling/watch).
  const directory = fs.mkdtempSync(path.join(resolvedParent, 'watch-'))
  const sync = (name) => {
    if (!runtime.includes(name)) throw new Error('Invalid runtime input')
    fs.cpSync(path.join(root, name), path.join(directory, name), {
      recursive: true,
    })
  }
  const dispose = () => {
    if (!fs.existsSync(directory)) return true
    // Check the resolved absolute deletion target before any recursive removal.
    if (
      fs.lstatSync(directory).isSymbolicLink() ||
      !isInside(resolvedParent, fs.realpathSync(directory))
    ) {
      throw new Error('Refusing to remove an unsafe staging path')
    }
    try {
      fs.rmSync(directory, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 100,
      })
      return true
    } catch (error) {
      // Antivirus or a descendant process may briefly hold handles after exit.
      // A leftover private folder must not turn a successful command into EPERM.
      if (['EPERM', 'EACCES', 'EBUSY', 'ENOTEMPTY'].includes(error.code))
        return false
      throw error
    }
  }
  try {
    runtime.forEach(sync)
    fs.writeFileSync(
      path.join(directory, '.gitignore'),
      'node_modules/\ndist/\n',
    )
    fs.symlinkSync(
      fs.realpathSync(path.join(root, 'node_modules')),
      path.join(directory, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    )
  } catch (error) {
    dispose()
    throw error
  }
  return { directory, sync, dispose, runtime }
}

module.exports = { createStage }
