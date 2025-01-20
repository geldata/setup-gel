import * as main from './main.js'
import * as win from './win.js'
import * as os from 'os'

if (os.platform() === 'win32') {
  /* istanbul ignore next */
  win.run()
} else {
  /* istanbul ignore next */
  main.run()
}
