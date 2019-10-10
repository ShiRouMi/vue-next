import { reactive, readonly, toRaw } from './reactive'
import { OperationTypes } from './operations'
import { track, trigger } from './effect'
import { LOCKED } from './lock'
import { isObject, hasOwn, isSymbol } from '@vue/shared'
import { isRef } from './ref'

const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .map(key => (Symbol as any)[key])
    .filter(isSymbol)
)
/*
劫持了 get 和 set 行为，
这两个行为同时也能原生劫持数组下标修改值及对象新增属性的行为
*/
// 深度侦测数据
/*
当对多层级的对象操作时，set 并不能感知到，但是 get 会触发，
 于此同时，利用 Reflect.get() 返回的“多层级对象中内层” ，
 再对“内层数据”做一次代理。
*/
function createGetter(isReadonly: boolean) {
  return function get(target: any, key: string | symbol, receiver: any) {
    const res = Reflect.get(target, key, receiver)
    if (isSymbol(key) && builtInSymbols.has(key)) {
      return res
    }
    if (isRef(res)) {
      return res.value
    }
    track(target, OperationTypes.GET, key)
    return isObject(res) 
    // 判断Reflect返回的数据是否是对象，
    //如果是对象，则再走一次 proxy ，从而获得了对对象内部的侦测。
      ? isReadonly
        ? // need to lazy access readonly and reactive here to avoid
          // circular dependency
          readonly(res)
        : reactive(res)
      : res
  }
}

function set(
  target: any,
  key: string | symbol,
  value: any,
  receiver: any
): boolean {
  value = toRaw(value)
  const hadKey = hasOwn(target, key)
  const oldValue = target[key]
  if (isRef(oldValue) && !isRef(value)) {
    oldValue.value = value
    return true
  }
  const result = Reflect.set(target, key, value, receiver)
  // don't trigger if target is something up in the prototype chain of original
  // 如果 target 是原型链上的某个属性，那么不触发
  if (target === toRaw(receiver)) {
    /* istanbul ignore else */
    if (__DEV__) {
      const extraInfo = { oldValue, newValue: value }
      if (!hadKey) {
        trigger(target, OperationTypes.ADD, key, extraInfo)
      } else if (value !== oldValue) {
        trigger(target, OperationTypes.SET, key, extraInfo)
      }
    } else {
      // 避免多次被触发
      // 判断 key 是否为 target 自身属性，以及设置val是否跟target[key]相等 
      if (!hadKey) {
        trigger(target, OperationTypes.ADD, key)
      } else if (value !== oldValue) {
        trigger(target, OperationTypes.SET, key)
      }
    }
  }
  return result
}

function deleteProperty(target: any, key: string | symbol): boolean {
  const hadKey = hasOwn(target, key)
  const oldValue = target[key]
  const result = Reflect.deleteProperty(target, key)
  if (result && hadKey) {
    /* istanbul ignore else */
    if (__DEV__) {
      trigger(target, OperationTypes.DELETE, key, { oldValue })
    } else {
      trigger(target, OperationTypes.DELETE, key)
    }
  }
  return result
}

function has(target: any, key: string | symbol): boolean {
  const result = Reflect.has(target, key)
  track(target, OperationTypes.HAS, key)
  return result
}

function ownKeys(target: any): (string | number | symbol)[] {
  track(target, OperationTypes.ITERATE)
  return Reflect.ownKeys(target)
}

export const mutableHandlers: ProxyHandler<any> = {
  get: createGetter(false),
  set,
  deleteProperty,
  has,
  ownKeys
}

export const readonlyHandlers: ProxyHandler<any> = {
  get: createGetter(true),

  set(target: any, key: string | symbol, value: any, receiver: any): boolean {
    if (LOCKED) {
      if (__DEV__) {
        console.warn(
          `Set operation on key "${String(key)}" failed: target is readonly.`,
          target
        )
      }
      return true
    } else {
      return set(target, key, value, receiver)
    }
  },

  deleteProperty(target: any, key: string | symbol): boolean {
    if (LOCKED) {
      if (__DEV__) {
        console.warn(
          `Delete operation on key "${String(
            key
          )}" failed: target is readonly.`,
          target
        )
      }
      return true
    } else {
      return deleteProperty(target, key)
    }
  },

  has,
  ownKeys
}
