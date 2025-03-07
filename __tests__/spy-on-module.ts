import { jest } from '@jest/globals'
import { FunctionLike } from 'jest-mock'

export type SpiedModule<T extends object> = {
  [K in keyof T]: T[K] extends FunctionLike
    ? jest.SpiedFunction<T[K]> & T[K]
    : T[K]
}

export const spyOnModule = async <T extends object>(
  moduleName: string
): Promise<SpiedModule<T>> => {
  const actual = await import(moduleName)
  const props = Object.getOwnPropertyNames(actual)
  jest.unstable_mockModule(moduleName, () =>
    Object.fromEntries(
      props.map((key) => {
        let value = actual[key]
        if (typeof value === 'function') {
          value = jest.fn(value)
        }
        return [key, value]
      })
    )
  )
  return await import(moduleName)
}
