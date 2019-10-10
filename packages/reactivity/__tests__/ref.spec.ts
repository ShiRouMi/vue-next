import { ref, effect, reactive, isRef, toRefs } from '../src/index'
import { computed } from '@vue/runtime-dom'
// ref 函数的声明，传递任何数据，能返回一个 Ref 数据
// Ref 类型是基于 Reactive 数据的一种特殊数据类型，
// 除了支持object外，还支持其他数据类型。
describe('reactivity/ref', () => {
  it('should hold a value', () => {
    const a = ref(1)
    expect(a.value).toBe(1)
    a.value = 2
    expect(a.value).toBe(2)
  })
// 如果向effect传递一个方法，会立即执行一次，
// 每当其内部依赖的ref数据发生变更时，会重新执行。
// 响应式操作：每当 reactive 数据变化时，触发依赖其的effect方法执行。
  it('should be reactive', () => {
    const a = ref(1)
    let dummy
    effect(() => {
      dummy = a.value
    })
    expect(dummy).toBe(1)
    a.value = 2
    expect(dummy).toBe(2)
  })
// 无论对象如何嵌套，修改代理数据，都能触发其 effect
// 修改原始数据，代理数据能同步，但是不会触发代理数据的 effect
  it('should make nested properties reactive', () => {
    const a = ref({
      count: 1
    })
    let dummy
    effect(() => {
      dummy = a.value.count
    })
    expect(dummy).toBe(1)
    a.value.count = 2
    expect(dummy).toBe(2)
  })
// 如果传给 reactive 函数一个 Ref 数据，
// 那函数执行后返回的数据类型是 Ref 数据的原始数据的数据类型。
// 修改 Reactive 数据，也会触发effect的更新
  it('should work like a normal property when nested in a reactive object', () => {
    const a = ref(1)
    const obj = reactive({
      a,
      b: {
        c: a,
        d: [a]
      }
    })
    let dummy1
    let dummy2
    let dummy3
    effect(() => {
      dummy1 = obj.a
      dummy2 = obj.b.c
      dummy3 = obj.b.d[0]
    })
    expect(dummy1).toBe(1)
    expect(dummy2).toBe(1)
    expect(dummy3).toBe(1)
    a.value++
    expect(dummy1).toBe(2)
    expect(dummy2).toBe(2)
    expect(dummy3).toBe(2)
    obj.a++
    expect(dummy1).toBe(3)
    expect(dummy2).toBe(3)
    expect(dummy3).toBe(3)
  })
// 对嵌套的 Ref 数据的取值，
// 只需要最开始使用.value，内部的代理数据不需要重复调用.value。
  it('should unwrap nested values in types', () => {
    const a = {
      b: ref(0)
    }

    const c = ref(a)

    expect(typeof (c.value.b + 1)).toBe('number')
  })

  test('isRef', () => {
    expect(isRef(ref(1))).toBe(true)
    expect(isRef(computed(() => 1))).toBe(true)

    expect(isRef(0)).toBe(false)
    expect(isRef(1)).toBe(false)
    // an object that looks like a ref isn't necessarily a ref
    // 看起来像 ref 的对象并不一定是 ref
    expect(isRef({ value: 0 })).toBe(false)
  })
// toRefs 跟 ref 的区别就是， 
// ref 会将传入的数据变成 Ref 类型，
// 而 toRefs 要求传入的数据必须是object，
// 然后将此对象的第一层数据转为 Ref 类型。
  test('toRefs', () => {
    const a = reactive({
      x: 1,
      y: 2
    })

    const { x, y } = toRefs(a)

    expect(isRef(x)).toBe(true)
    expect(isRef(y)).toBe(true)
    expect(x.value).toBe(1)
    expect(y.value).toBe(2)

    // source -> proxy
    a.x = 2
    a.y = 3
    expect(x.value).toBe(2)
    expect(y.value).toBe(3)

    // proxy -> source
    x.value = 3
    y.value = 4
    expect(a.x).toBe(3)
    expect(a.y).toBe(4)

    // reactivity
    let dummyX, dummyY
    effect(() => {
      dummyX = x.value
      dummyY = y.value
    })
    expect(dummyX).toBe(x.value)
    expect(dummyY).toBe(y.value)

    // mutating source should trigger effect using the proxy refs
    a.x = 4
    a.y = 5
    expect(dummyX).toBe(4)
    expect(dummyY).toBe(5)
  })
})
