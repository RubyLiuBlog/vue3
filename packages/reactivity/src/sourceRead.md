# Vue 3 reactivity

**主要文件及其功能:**

- **`reactivity/src/effect.ts`**: 定义响应式副作用的核心逻辑，包括 `watchEffect`、`watch` 的底层实现。核心方法：
  - `effect(fn, options?)`: 创建一个响应式副作用。
  - `track(target, type, key)`: 收集依赖。
  - `trigger(target, type, key, newValue?, oldValue?)`: 触发更新。
- **`reactivity/src/reactive.ts`**: 定义 `reactive` 函数，用于创建响应式对象。核心方法：
  - `reactive(target)`: 创建一个响应式代理对象。
  - `createReactiveObject(...)`: 创建响应式对象的内部实现。
  - `isReactive(value)`:判断一个对象是否是reactive对象
  - `shallowReactive(target)`: 创建一个浅层响应式对象（只有根级别的属性是响应式的）。
- **`reactivity/src/ref.ts`**: 定义 `ref` 函数，用于创建单个值的响应式引用。核心方法：
  - `ref(value)`: 创建一个 ref 对象。
  - `isRef(value)`:判断一个对象是否是ref对象
  - `unref(value)`: 如果参数是 ref，则返回内部值，否则返回参数本身。
  - `shallowRef(value)`: 创建一个浅层 ref（不会对嵌套对象进行深度响应式转换）。
- **`reactivity/src/computed.ts`**: 定义 `computed` 函数，用于创建计算属性。核心方法：
  - `computed(getterOrOptions)`: 创建一个计算属性 ref。
- **`reactivity/src/watch.ts`**: `watch` 和 `watchEffect` API。核心方法:
  - `watch(source, cb, options?)`: 监听一个或多个响应式数据源，并在数据变化时执行回调。
  - `watchEffect(effect,options?)`:立即运行一个函数,同时响应式的追踪其依赖,并在依赖更改时重新运行它

1. **核心模块之间的依赖**：

   - `reactive.ts` 和 `ref.ts` 都依赖 `effect.ts`。这是因为它们创建的响应式对象和 ref 都需要使用 effect(track | trriger) 来跟踪依赖和触发更新。
   - `computed.ts` 也依赖 `effect.ts`，因为它需要创建一个 effect 来运行 getter 函数，并收集 getter 中访问的响应式数据的依赖。
   - `watch.ts` 依赖 `effect.ts`来实现其响应式追踪。

2. **`effect.ts` 的核心地位**：`effect.ts` 提供了响应式系统的核心机制。它定义了 `effect` 函数，该函数用于创建一个响应式副作用。当 effect 运行期间访问了响应式数据（通过 `track` 收集依赖），就会建立起响应式数据和 effect 之间的关联。当响应式数据发生变化时（通过 `trigger` 触发更新），所有依赖于该数据的 effect 都会被重新执行。

3. **readonly 和 shallowReactive**:提供了创建对象的只读变体和浅层响应式功能，它们基于 `createReactiveObject`，但是使用了不同的处理程序。

总的来说，Vue 3 的 reactivity 包通过精巧的设计和 Proxy 对象的使用，实现了一个高效且灵活的响应式系统。上述文件和方法的划分，使得代码结构清晰，易于维护和扩展。
