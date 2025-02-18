const ReactiveFlags = {
  SKIP: '__v_skip',
  IS_REACTIVE: '__v_isReactive',
  IS_READONLY: '__v_isReadonly',
  IS_SHALLOW: '__v_isShallow',
  RAW: '__v_raw',
  IS_REF: '__v_isRef',
}

let activeEffect = null
function effect(fn) {
  activeEffect = fn
  activeEffect()
  activeEffect = null
}

const targetMap = new WeakMap()
const track = (target, key) => {
  if (activeEffect) {
    let depsMap = targetMap.get(target)
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
      depsMap.set(key, (dep = new Set()))
    }
    dep.add(activeEffect)
  }
}

// run all the code when i`ve saved
const trigger = (target, key) => {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
  const dep = depsMap.get(key)
  if (dep) {
    dep.forEach(effect => effect())
  }
}
// ------以上为基本属性---------以下为实现--Proxy And Reflect-------------
function reactive(target) {
  const handler = {
    get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver)
      track(target, key)
      return result
    },
    set(target, key, value, receiver) {
      const oldValue = target[key]
      const result = value
      if (oldValue != value) {
        Reflect.set(target, key, value, receiver)
        trigger(target, key)
      }
      return result
    },
  }
  return new Proxy(target, handler)
}

function ref(raw) {
  const r = {
    __v_isRef: true,
    get value() {
      track(r, 'value')
      return raw
    },
    set value(newVal) {
      if (raw !== newVal) {
        raw = newVal
        trigger(r, 'value')
      }
    },
  }
  return r
}

export function isRef(r) {
  return r ? r[ReactiveFlags.IS_REF] === true : false
}

function computed(fn) {
  const result = ref()
  effect(() => (result.value = fn()))
  return result
}

function watch(getter, callback) {
  let oldValue, newValue
  let firstRun = true
  // 利用 effect 收集 getter 内部对数据的依赖，
  // 数据变化时 effect 会重新运行，并调用 callback
  effect(() => {
    newValue = getter()
    if (firstRun) {
      // 第一次执行不触发回调
      oldValue = newValue
      firstRun = false
    } else {
      callback(oldValue, newValue)
      oldValue = newValue
    }
  })
}

function watchEffect(fn) {
  // 利用 effect 收集 fn 内部对数据的依赖，
  // 数据变化时 effect 会重新运行，并调用 fn
  effect(fn)
}

export { effect, reactive, ref, computed, watch, watchEffect }
