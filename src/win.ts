import * as main from './main.js'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as os from 'os'
import * as path from 'path'

export async function run(): Promise<void> {
  try {
    await installCLI()
    await installServer()
  } catch (error) {
    core.setFailed((error as Error).message)
  }
}

async function checkOutput(cmd: string, args?: string[]): Promise<string> {
  let out = ''

  const options = {
    listeners: {
      stdout: (data: Buffer) => {
        out += data.toString()
      }
    }
  }

  await exec.exec(cmd, args, options)
  return out.trim()
}

async function getBaseDist(): Promise<string> {
  const arch = os.arch()
  const platform = (await checkOutput('wsl uname')).toLocaleLowerCase()

  return main.getBaseDist(arch, platform, 'musl')
}

async function installCLI(): Promise<void> {
  const requestedCLIVersion = core.getInput('cli-version')
  const arch = os.arch()
  const includeCliPrereleases = true
  let cliVersionRange = '*'
  let dist = await getBaseDist()

  if (requestedCLIVersion === 'nightly') {
    dist += '.nightly'
  } else if (requestedCLIVersion !== 'stable') {
    cliVersionRange = requestedCLIVersion
  }

  const versionMap = await main.getVersionMap(dist)
  const matchingVer = await main.getMatchingVer(
    versionMap,
    cliVersionRange,
    includeCliPrereleases
  )

  const cliPkg = versionMap.get(matchingVer)!
  const downloadUrl = new URL(cliPkg.installref, main.PKG_ROOT).href

  core.info(`Downloading gel-cli ${matchingVer} - ${arch} from ${downloadUrl}`)

  await checkOutput('wsl', [
    'curl',
    '--fail',
    '--output',
    '/usr/bin/gel',
    downloadUrl
  ])
  await checkOutput('wsl chmod +x /usr/bin/gel')
  // Compatibility
  await checkOutput('wsl ln -s gel /usr/bin/edgedb')
}

async function installServer(): Promise<void> {
  const requestedVersion = core.getInput('server-version')

  const args = []

  if (requestedVersion === 'nightly') {
    args.push('--nightly')
  } else if (requestedVersion !== '' && requestedVersion !== 'stable') {
    args.push('--version')
    args.push(requestedVersion)
  }

  await checkOutput('wsl', ['gel', 'server', 'install'].concat(args))

  if (args.length === 0) {
    args.push('--latest')
  }
  const bin = (
    await checkOutput(
      'wsl',
      ['gel', 'server', 'info', '--bin-path'].concat(args)
    )
  ).trim()

  if (bin === '') {
    throw Error('could not find gel-server bin')
  }

  const instDir = path.dirname(path.dirname(bin))
  const binName = path.basename(bin)

  await checkOutput('wsl', ['cp', '-a', instDir, '/opt/gel'])

  await checkOutput('wsl', [
    'ln',
    '-s',
    '/opt/gel/bin/' + binName,
    '/usr/bin/' + binName
  ])

  if (binName != 'gel-server') {
    await checkOutput('wsl', [
      'ln',
      '-s',
      '/opt/gel/bin/' + binName,
      '/usr/bin/gel-server'
    ])
  }
}
