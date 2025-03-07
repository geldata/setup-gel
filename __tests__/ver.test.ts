import * as main from '../src/main'
import { expect, describe, it } from '@jest/globals'

describe('setup-gel', () => {
  it('Sorts versions correctly', async () => {
    const versionMap = new Map([
      ['1.0.0-beta.2+d20210806.g803b254e6', 'foo'],
      ['1.0.0-beta.2+d20210808.g121de78de', 'baz'],
      ['1.0.0-beta.2+d20210807.gba2c70f52', 'bar'],
      ['1.0.0-rc.2+d20211007.gba2c70f52', 'rc']
    ])

    let ver = await main.getMatchingVer(versionMap, '1.0.0-beta.2', true)
    expect(ver).toBe('1.0.0-beta.2+d20210808.g121de78de')

    ver = await main.getMatchingVer(versionMap, '*', true)
    expect(ver).toBe('1.0.0-rc.2+d20211007.gba2c70f52')
  })
})
