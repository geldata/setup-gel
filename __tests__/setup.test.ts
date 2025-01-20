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

    const tmpdir = fs.mkdtempSync('gel-setup')
    let tmp = path.join(tmpdir, 'foo')
    fs.closeSync(fs.openSync(tmp, 'w'))
    tmp = fs.realpathSync(tmp)

    tc.downloadTool.mockImplementation(async () => tmp)

    tc.find.mockImplementation(() => '')

    const cliPath = path.normalize('/cache/gel/7.0.3')
    tc.cacheFile.mockImplementation(async () => cliPath)

    await main.run()

    fs.unlinkSync(tmp)
    fs.rmdirSync(tmpdir)

    expect(tc.downloadTool).toHaveBeenCalled()
    expect(core.info).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(
          `Downloading gel-cli ${expectedVer} - ${os.arch()} from ${expectedUrl}`
        )
      )
    )
    expect(core.addPath).toHaveBeenCalledWith(cliPath)
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

    const tmpdir = fs.mkdtempSync('gel-setup')
    let tmp = path.join(tmpdir, 'foo')
    fs.closeSync(fs.openSync(tmp, 'w'))
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
    const serverPath = path.dirname(tmp)

    await main.run()

    fs.unlinkSync(tmp)
    fs.rmdirSync(tmpdir)

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
})
