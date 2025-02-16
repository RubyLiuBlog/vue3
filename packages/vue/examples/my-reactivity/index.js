// the active effect running
let activeEffect = null
// the code we want to run
function effect(fn) {
  activeEffect = fn
  activeEffect()
  activeEffect = null
}

const targetMap = new WeakMap()
// the code we want to save
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
      const result = Reflect.set(target, key, value, receiver)
      if (oldValue != Reflect.get(target, key, receiver)) {
        trigger(target, key)
      }
      return result
    },
  }
  return new Proxy(target, handler)
}

function ref(raw) {
  const r = {
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

function computed(fn) {
  const result = ref()
  effect(() => (result.value = fn()))
  return result
}
export { effect, reactive, ref, computed }
