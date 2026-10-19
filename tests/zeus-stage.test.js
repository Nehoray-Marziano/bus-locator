import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fork } from 'node:child_process'
import { once } from 'node:events'
import staging from '../scripts/zeus-stage.cjs'

const { createStage } = staging
const temporary = fs.realpathSync(os.tmpdir())

async function projectFixture(run) {
  const root = fs.mkdtempSync(path.join(temporary, 'meitar-zeus-test-'))
  try {
    for (const name of ['app.js', 'app.json', 'package.json']) {
      fs.writeFileSync(path.join(root, name), '{}')
    }
    for (const name of [
      'page',
      'shared',
      'app-side',
      'app-widget',
      'setting',
      'assets',
      'node_modules',
      'tests',
    ]) {
      fs.mkdirSync(path.join(root, name))
      fs.writeFileSync(path.join(root, name, 'keep.txt'), 'original')
    }
    fs.writeFileSync(
      path.join(root, 'holder.cjs'),
      "process.send('ready'); process.on('message', () => process.exit(0))",
    )
    await run(root)
  } finally {
    // Verify the absolute target before removing this test's private fixture.
    assert.equal(path.dirname(root), temporary)
    assert.ok(path.basename(root).startsWith('meitar-zeus-test-'))
    assert.equal(fs.realpathSync(root), root)
    fs.rmSync(root, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    })
  }
}

async function holdDirectory(root, directory, run) {
  const child = fork(path.join(root, 'holder.cjs'), [], {
    cwd: directory,
    stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
    windowsHide: true,
  })
  try {
    await once(child, 'message')
    await run()
  } finally {
    const closed = once(child, 'close')
    if (child.connected) child.send('stop')
    else child.kill()
    await closed
  }
}

test(
  'preview staging leaves an active legacy dev directory untouched',
  { timeout: 15000 },
  () =>
    projectFixture(async (root) => {
      const legacy = path.join(root, '.tooling', 'watch')
      fs.mkdirSync(legacy, { recursive: true })
      fs.writeFileSync(path.join(legacy, 'session.txt'), 'running')
      await holdDirectory(root, legacy, () => {
        const stage = createStage(root)
        assert.notEqual(stage.directory, legacy)
        assert.equal(
          fs.readFileSync(path.join(legacy, 'session.txt'), 'utf8'),
          'running',
        )
        assert.equal(stage.dispose(), true)
      })
    }),
)

test('concurrent commands receive isolated runtime copies and dev sync stays local', () =>
  projectFixture((root) => {
    const first = createStage(root)
    fs.writeFileSync(path.join(root, 'shared', 'keep.txt'), 'changed')
    const second = createStage(root)
    assert.notEqual(first.directory, second.directory)
    assert.equal(
      fs.readFileSync(path.join(first.directory, 'shared', 'keep.txt'), 'utf8'),
      'original',
    )
    assert.equal(
      fs.readFileSync(
        path.join(second.directory, 'shared', 'keep.txt'),
        'utf8',
      ),
      'changed',
    )
    assert.equal(fs.existsSync(path.join(first.directory, 'tests')), false)
    assert.equal(fs.existsSync(path.join(first.directory, 'holder.cjs')), false)
    first.sync('shared')
    assert.equal(
      fs.readFileSync(path.join(first.directory, 'shared', 'keep.txt'), 'utf8'),
      'changed',
    )
    assert.throws(() => first.sync('../tests'), /Invalid runtime input/)
    assert.equal(first.dispose(), true)
    assert.equal(fs.existsSync(second.directory), true)
    assert.equal(second.dispose(), true)
  }))

test('cleanup removes only the private stage and preserves linked dependencies', () =>
  projectFixture((root) => {
    const stage = createStage(root)
    assert.equal(
      fs.realpathSync(path.join(stage.directory, 'node_modules')),
      path.join(root, 'node_modules'),
    )
    assert.equal(stage.dispose(), true)
    assert.equal(stage.dispose(), true)
    assert.equal(fs.existsSync(stage.directory), false)
    assert.equal(
      fs.readFileSync(path.join(root, 'node_modules', 'keep.txt'), 'utf8'),
      'original',
    )
    assert.equal(fs.existsSync(path.join(root, 'app.js')), true)
  }))

test(
  'a Windows cleanup lock does not block the next command',
  { timeout: 15000 },
  () =>
    projectFixture(async (root) => {
      const first = createStage(root)
      await holdDirectory(root, first.directory, () => {
        assert.equal(first.dispose(), process.platform !== 'win32')
        const second = createStage(root)
        assert.notEqual(second.directory, first.directory)
        assert.equal(fs.existsSync(path.join(second.directory, 'app.js')), true)
        assert.equal(second.dispose(), true)
      })
      assert.equal(first.dispose(), true)
    }),
)

test('cleanup refuses a stage replaced with a junction', () =>
  projectFixture((root) => {
    const stage = createStage(root)
    stage.dispose()
    fs.symlinkSync(
      path.join(root, 'assets'),
      stage.directory,
      process.platform === 'win32' ? 'junction' : 'dir',
    )
    try {
      assert.throws(() => stage.dispose(), /unsafe staging path/)
      assert.equal(
        fs.readFileSync(path.join(root, 'assets', 'keep.txt'), 'utf8'),
        'original',
      )
    } finally {
      fs.unlinkSync(stage.directory)
    }
  }))

test('staging refuses a runs junction outside the workspace', () =>
  projectFixture((root) =>
    projectFixture((outside) => {
      fs.mkdirSync(path.join(root, '.tooling'))
      const runs = path.join(root, '.tooling', 'runs')
      fs.symlinkSync(
        outside,
        runs,
        process.platform === 'win32' ? 'junction' : 'dir',
      )
      try {
        assert.throws(() => createStage(root), /Staging path escaped workspace/)
        assert.equal(fs.existsSync(path.join(outside, 'app.js')), true)
        assert.deepEqual(
          fs.readdirSync(outside).filter((name) => name.startsWith('watch-')),
          [],
        )
      } finally {
        fs.unlinkSync(runs)
      }
    }),
  ))
