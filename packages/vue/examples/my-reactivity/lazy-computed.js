// ----------------核心响应式实现-------------------

// 当前正在执行的副作用函数
let activeEffect = null

// effect 函数，支持 scheduler 及 lazy 配置
function effect(fn, options = {}) {
  const effectFn = () => {
    // 开始收集依赖前将 activeEffect 赋值
    activeEffect = effectFn
    // 执行副作用代码
    const res = fn()
    // 执行完毕后重置 activeEffect
    activeEffect = null
    return res
  }
  // 挂载用户自定义的调度函数（如果有）
  effectFn.scheduler = options.scheduler
  // lazy 为 true 时不立即执行
  if (!options.lazy) {
    effectFn()
  }
  return effectFn
}

// 依赖存储：target -> key -> effects
const targetMap = new WeakMap()

// 收集依赖：当属性被读取时调用
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

// 触发依赖：当属性更新时调用
const trigger = (target, key) => {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  const dep = depsMap.get(key)
  if (dep) {
    dep.forEach(effectFn => {
      // 如果 effectFn 配置了 scheduler，则由 scheduler 决定何时执行
      if (effectFn.scheduler) {
        effectFn.scheduler()
      } else {
        effectFn()
      }
    })
  }
}

// ----------------响应式核心（Proxy + Reflect）-------------------

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
      if (oldValue !== Reflect.get(target, key, receiver)) {
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

// ----------------computed 实现-------------------
//
// computed 接受一个 getter 函数，返回一个只有 value 属性的对象。
// 当内部依赖发生变化时，通过 scheduler 将 dirty 标志置为 true，
// 下一次访问 computed.value 时重新计算，并触发依赖更新。

function computed(getter) {
  let value // 缓存计算结果
  let dirty = true // 是否需要重新计算

  // computed 自身也可能被其他 effect 依赖，所以也需要响应式追踪
  const computedObj = {
    get value() {
      // 在被其他 effect 访问时，收集 computed 的依赖
      track(computedObj, 'value')
      // 如果 dirty 为 true，则重新计算最新的值
      if (dirty) {
        // 调用 runner 执行 getter，拿到计算结果
        value = runner()
        dirty = false
      }
      return value
    },
  }

  // 通过 effect 创建 runner，配置 lazy 不立即执行
  const runner = effect(getter, {
    lazy: true,
    // scheduler 会在依赖变化时调用，此时将 dirty 设置为 true，
    // 同时触发 computed 的更新通知（即触发 computedObj 的 'value' 依赖）
    scheduler() {
      if (!dirty) {
        dirty = true
        trigger(computedObj, 'value')
      }
    },
  })

  return computedObj
}

// -----------------示例使用----------------------
// 示例：computed 自动依赖 tracking 与缓存

const state = reactive({ count: 1 })
const plus = computed(() => state.count + 1)

// effect 中访问 computed.value 会自动建立依赖关系
effect(() => {
  console.log('computed value:', plus.value)
})

// 初始输出: computed value: 2

// 修改 state.count，computed 的依赖变化，scheduler 将 dirty 置为 true，
// 从而触发 effect 重新执行计算
state.count++ // 输出：computed value: 3

//---------------------------------------------------------------

/*
说明：

修改后的 effect 函数支持 scheduler 和 lazy 选项，这对于 computed 的实现至关重要；
computed 内部在 getter 中调用 track(computedObj, 'value')，使得它自身也能被其它 effect 收集；
当 computed 内部依赖发生变化时，scheduler 将 dirty 置为 true 并调用 trigger(computedObj, 'value')，
通知依赖 computed.value 的 effect 重新执行；
computed.value getter 中首次读取或 dirty 为 true 时，会用 runner 重新执行 getter，从而缓存计算结果。
*/
