import { reactive, isReactive, toRaw, markNonReactive } from '../src/reactive'
import { mockWarn } from '@vue/runtime-test'

describe('reactivity/reactive', () => {
  mockWarn()
  /*
  reactive 接收对象，返回 UnwrapNestedRefs 类型
  */
  test('Object', () => {
    const original = { foo: 1 }
    const observed = reactive(original)
    expect(observed).not.toBe(original)
    expect(isReactive(observed)).toBe(true)
    expect(isReactive(original)).toBe(false)
    // get
    expect(observed.foo).toBe(1)
    // has
    expect('foo' in observed).toBe(true)
    // ownKeys
    expect(Object.keys(observed)).toEqual(['foo'])
  })

  test('Array', () => {
    const original = [{ foo: 1 }]
    const observed = reactive(original)
    expect(observed).not.toBe(original)
    expect(isReactive(observed)).toBe(true)
    expect(isReactive(original)).toBe(false)
    expect(isReactive(observed[0])).toBe(true)
    // get
    expect(observed[0].foo).toBe(1)
    // has
    expect(0 in observed).toBe(true)
    // ownKeys
    expect(Object.keys(observed)).toEqual(['0'])
  })
// 克隆的响应式数组应该指向观察的值
  test('cloned reactive Array should point to observed values', () => {
    const original = [{ foo: 1 }]
    const observed = reactive(original)
    const clone = observed.slice()
    expect(isReactive(clone[0])).toBe(true)
    expect(clone[0]).not.toBe(original[0])
    expect(clone[0]).toBe(observed[0])
  })
// 嵌套情况
  test('nested reactives', () => {
    const original = {
      nested: {
        foo: 1
      },
      array: [{ bar: 2 }]
    }
    const observed = reactive(original)
    expect(isReactive(observed.nested)).toBe(true)
    expect(isReactive(observed.array)).toBe(true)
    expect(isReactive(observed.array[0])).toBe(true)
  })
// 响应式，通过 reactive 操作后的数据，对其进行设置删除操作，能同步影响到原始数据
  // 另外：直接修改原始数据，响应数据也能获取的最新数据。
  test('observed value should proxy mutations to original (Object)', () => {
    const original: any = { foo: 1 }
    const observed = reactive(original)
    // set
    observed.bar = 1
    expect(observed.bar).toBe(1)
    expect(original.bar).toBe(1)
    // delete
    delete observed.foo
    expect('foo' in observed).toBe(false)
    expect('foo' in original).toBe(false)
  })
 // 使用 proxy 可以劫持数组的所有数据变更
  test('observed value should proxy mutations to original (Array)', () => {
    const original: any[] = [{ foo: 1 }, { bar: 2 }]
    const observed = reactive(original)
    // set
    const value = { baz: 3 }
    const reactiveValue = reactive(value)
    observed[0] = value
    expect(observed[0]).toBe(reactiveValue)
    expect(original[0]).toBe(value)
    // delete
    delete observed[0]
    expect(observed[0]).toBeUndefined()
    expect(original[0]).toBeUndefined()
    // mutating methods
    observed.push(value)
    expect(observed[2]).toBe(reactiveValue)
    expect(original[2]).toBe(value)
  })
// vue@3的响应式数据的属性值终于可以随时添加删除了。
  test('setting a property with an unobserved value should wrap with reactive', () => {
    const observed = reactive<{ foo?: object }>({})
    const raw = {}
    observed.foo = raw
    expect(observed.foo).not.toBe(raw)
    expect(isReactive(observed.foo)).toBe(true)
  })
// 以下两个单测说明了
// 对于同一个原始数据，执行多次 reactive 或者嵌套执行 reactive ,
// 返回的结果都是同一个相应数据
  test('observing already observed value should return same Proxy', () => {
    const original = { foo: 1 }
    const observed = reactive(original)
    const observed2 = reactive(observed)
    expect(observed2).toBe(observed)
  })

  test('observing the same value multiple times should return same Proxy', () => {
    const original = { foo: 1 }
    const observed = reactive(original)
    const observed2 = reactive(original)
    expect(observed2).toBe(observed)
  })
// 不应使用代理污染原始对象
  test('should not pollute original object with Proxies', () => {
    const original: any = { foo: 1 }
    const original2 = { bar: 2 }
    const observed = reactive(original)
    const observed2 = reactive(original2)
    observed.bar = observed2
    expect(observed.bar).toBe(observed2)
    expect(original.bar).toBe(original2)
  })
// 通过 toRaw, 将响应数据返回原始数据
  // 说明 reactive 文件内还需要维持另外一个 WeakMap 做反向映射。
  // ???
  test('unwrap', () => {
    const original = { foo: 1 }
    const observed = reactive(original)
    expect(toRaw(observed)).toBe(original)
    expect(toRaw(original)).toBe(original)
  })
 // 不可观察的值
  test('non-observable values', () => {
    const assertValue = (value: any) => {
      reactive(value)
      expect(
        `value cannot be made reactive: ${String(value)}`
      ).toHaveBeenWarnedLast()
    }
// JS 6大基本数据类型
    // number
    assertValue(1)
    // string
    assertValue('foo')
    // boolean
    assertValue(false)
    // null
    assertValue(null)
    // undefined
    assertValue(undefined)
    // symbol
    const s = Symbol()
    assertValue(s)
// 以下内置对象不会保存，返回原始值
    // built-ins should work and return same value
    const p = Promise.resolve()
    expect(reactive(p)).toBe(p)
    const r = new RegExp('')
    expect(reactive(r)).toBe(r)
    const d = new Date()
    expect(reactive(d)).toBe(d)
  })
// 通过 markNonReactive 包裹的数据，不会成为响应式数据
  // 真实业务中应该使用比较少，做某些特殊的性能优化时可能会使用到。
  test('markNonReactive', () => {
    const obj = reactive({
      foo: { a: 1 },
      bar: markNonReactive({ b: 2 })
    })
    expect(isReactive(obj.foo)).toBe(true)
    expect(isReactive(obj.bar)).toBe(false)
  })
})
