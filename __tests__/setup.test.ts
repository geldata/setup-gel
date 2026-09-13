import type * as coreType from '@actions/core'
import type * as execType from '@actions/exec'
import type * as tcType from '@actions/tool-cache'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as process from 'process'
import url from 'url'
import type * as mainType from '../src/main'
import { SpiedModule, spyOnModule } from './spy-on-module'

const tempDir = path.join(
  path.dirname(url.fileURLToPath(import.meta.url)),
  'runner',
  Math.random().toString(36).substring(7)
)
process.env.RUNNER_TOOL_CACHE = path.join(tempDir, 'tools')
process.env.RUNNER_TEMP = path.join(tempDir, 'temp')

describe('setup-gel', () => {
  let inputs: Record<string, string | boolean> = {}
  let core: SpiedModule<typeof coreType>
  let exec: SpiedModule<typeof execType>
  let tc: SpiedModule<typeof tcType>
  let main: typeof mainType

  beforeAll(async () => {
    core = await spyOnModule<typeof coreType>('@actions/core')
    tc = await spyOnModule<typeof tcType>('@actions/tool-cache')
    exec = await spyOnModule<typeof execType>('@actions/exec')
    // After mocks have been set up
    main = await import('../src/main')
  })

  beforeEach(async () => {
    console.log('::stop-commands::stoptoken')
    process.env['GITHUB_PATH'] = ''
    inputs = {
      'server-dsn': false
    }

    core.getInput.mockImplementation((name) => String(inputs[name] || ''))
    core.getBooleanInput.mockImplementation((name) => Boolean(inputs[name]))

    core.info.mockImplementation((line) => {
      // uncomment to debug
      process.stderr.write(`log:${line}\n`)
    })
    core.debug.mockImplementation((msg) => {
      // uncomment to see debug output
      process.stderr.write(`${msg}\n`)
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
    jest.clearAllMocks()
  })

  it('Installs CLI', async () => {
    inputs['cli-version'] = '>=7.0.0 <=7.0.3'

    let libc = ''
    if (os.platform() === 'linux') {
      libc = 'musl'
    }
    const baseDist = main.getBaseDist(os.arch(), os.platform(), libc)
    const pkgBase = `https://packages.geldata.com/archive/${baseDist}`
    const expectedVer = '7.0.3\\+([0-9a-f]{7})'
    const expectedUrl = `${pkgBase}/gel-cli-${expectedVer}`

    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'gel-setup-'))
    let tmp = path.join(tmpdir, 'foo')
    fs.writeFileSync(tmp, '', { flag: 'w' })
    tmp = fs.realpathSync(tmp)

    tc.downloadTool.mockImplementation(async () => tmp)

    tc.find.mockImplementation(() => '')

    const cliPath = path.normalize('/cache/gel/7.0.3')
    tc.cacheFile.mockImplementation(async () => cliPath)
    tc.cacheDir.mockImplementation(async () => cliPath)

    await main.run()

    expect(tc.downloadTool).toHaveBeenCalled()
    expect(core.info).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(
          `Downloading gel-cli ${expectedVer} - ${os.arch()} from ${expectedUrl}`
        )
      )
    )
    expect(core.addPath).toHaveBeenCalledWith(cliPath)

    fs.rmSync(tmpdir, { recursive: true, force: true })
  })

  it('Installs server', async () => {
    inputs['cli-version'] = '>=7.0.0 <=7.0.3'
    inputs['server-version'] = 'stable'

    let libc = ''
    if (os.platform() === 'linux') {
      libc = 'musl'
    }
    const baseDist = main.getBaseDist(os.arch(), os.platform(), libc)
    const pkgBase = `https://packages.geldata.com/archive/${baseDist}`
    const expectedVer = '7.0.3\\+([0-9a-f]{7})'
    const expectedUrl = `${pkgBase}/gel-cli-${expectedVer}`

    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'gel-setup-'))
    let tmp = path.join(tmpdir, 'foo')
    fs.writeFileSync(tmp, '', { flag: 'w' })
    tmp = fs.realpathSync(tmp)

    tc.downloadTool.mockImplementation(async () => tmp)

    tc.find.mockImplementation(() => '')

    exec.exec.mockImplementation(async (cmd, args, opts) => {
      if (args && args[0] === 'server' && args[1] === 'install') {
        return 0
      } else if (
        args &&
        args[0] === 'server' &&
        args[1] === 'info' &&
        args[2] === '--bin-path'
      ) {
        if (opts?.listeners?.stdout) {
          opts.listeners.stdout(Buffer.from(tmp))
        }
        return 0
      } else {
        return 1
      }
    })

    const cliPath = path.normalize('/cache/gel/7.0.3')
    tc.cacheFile.mockImplementation(async () => cliPath)
    tc.cacheDir.mockImplementation(async () => cliPath)
    const serverPath = path.dirname(tmp)

    await main.run()

    fs.rmSync(tmpdir, { recursive: true, force: true })

    expect(tc.downloadTool).toHaveBeenCalled()
    expect(core.info).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(
          `Downloading gel-cli ${expectedVer} - ${os.arch()} from ${expectedUrl}`
        )
      )
    )
    expect(core.addPath).toHaveBeenCalledWith(serverPath)
    expect(core.addPath).toHaveBeenCalledWith(cliPath)
  })

  it('Merges environment variables when creating named instance', async () => {
    inputs['cli-version'] = '>=7.0.0 <=7.0.3'
    inputs['server-version'] = 'stable'
    inputs['instance-name'] = 'test-instance'
    process.env.TEST_CUSTOM_ENV = 'preserved_val'

    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'gel-setup-'))
    let tmp = path.join(tmpdir, 'foo')
    fs.writeFileSync(tmp, '', { flag: 'w' })
    tmp = fs.realpathSync(tmp)

    tc.downloadTool.mockImplementation(async () => tmp)
    tc.find.mockImplementation(() => '')

    let instanceCreateOpts: execType.ExecOptions | undefined
    exec.exec.mockImplementation(async (cmd, args, opts) => {
      if (args && args[0] === 'server' && args[1] === 'install') {
        return 0
      } else if (
        args &&
        args[0] === 'server' &&
        args[1] === 'info' &&
        args[2] === '--bin-path'
      ) {
        if (opts?.listeners?.stdout) {
          opts.listeners.stdout(Buffer.from(tmp))
        }
        return 0
      } else if (args && args[0] === 'instance' && args[1] === 'create') {
        instanceCreateOpts = opts
        return 0
      } else if (args && args[0] === 'instance' && args[1] === 'start') {
        return 0
      } else {
        return 1
      }
    })

    const cliPath = path.normalize('/cache/gel/7.0.3')
    tc.cacheFile.mockImplementation(async () => cliPath)
    tc.cacheDir.mockImplementation(async () => cliPath)

    try {
      await main.run()
    } finally {
      delete process.env.TEST_CUSTOM_ENV
      fs.rmSync(tmpdir, { recursive: true, force: true })
    }

    expect(instanceCreateOpts?.env).toBeDefined()
    expect(instanceCreateOpts?.env?.TEST_CUSTOM_ENV).toBe('preserved_val')
    expect(instanceCreateOpts?.env?.XDG_RUNTIME_DIR).toBeDefined()
  })

  it('Supports explicit package-root input and exports variables', async () => {
    inputs['cli-version'] = '>=7.0.0 <=7.0.3'
    inputs['package-root'] = 'https://packages.geldata.com/'

    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'gel-setup-'))
    let tmp = path.join(tmpdir, 'foo')
    fs.writeFileSync(tmp, '', { flag: 'w' })
    tmp = fs.realpathSync(tmp)

    tc.downloadTool.mockImplementation(async () => tmp)
    tc.find.mockImplementation(() => '')

    const cliPath = path.normalize('/cache/gel/7.0.3')
    tc.cacheFile.mockImplementation(async () => cliPath)
    tc.cacheDir.mockImplementation(async () => cliPath)

    try {
      await main.run()
    } finally {
      fs.rmSync(tmpdir, { recursive: true, force: true })
    }

    expect(core.exportVariable).toHaveBeenCalledWith(
      'GEL_PKG_ROOT',
      'https://packages.geldata.com'
    )
    expect(core.exportVariable).toHaveBeenCalledWith(
      'EDGEDB_PKG_ROOT',
      'https://packages.geldata.com'
    )
    expect(process.env.GEL_PKG_ROOT).toBe('https://packages.geldata.com')
    expect(process.env.EDGEDB_PKG_ROOT).toBe('https://packages.geldata.com')
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('https://packages.geldata.com/archive/')
    )
  })

  it('Supports pkg-root input alias', async () => {
    inputs['cli-version'] = '>=7.0.0 <=7.0.3'
    inputs['pkg-root'] = 'https://packages.geldata.com/'

    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'gel-setup-'))
    let tmp = path.join(tmpdir, 'foo')
    fs.writeFileSync(tmp, '', { flag: 'w' })
    tmp = fs.realpathSync(tmp)

    tc.downloadTool.mockImplementation(async () => tmp)
    tc.find.mockImplementation(() => '')

    const cliPath = path.normalize('/cache/gel/7.0.3')
    tc.cacheFile.mockImplementation(async () => cliPath)
    tc.cacheDir.mockImplementation(async () => cliPath)

    try {
      await main.run()
    } finally {
      fs.rmSync(tmpdir, { recursive: true, force: true })
    }

    expect(core.exportVariable).toHaveBeenCalledWith(
      'GEL_PKG_ROOT',
      'https://packages.geldata.com'
    )
    expect(core.exportVariable).toHaveBeenCalledWith(
      'EDGEDB_PKG_ROOT',
      'https://packages.geldata.com'
    )
  })
})
