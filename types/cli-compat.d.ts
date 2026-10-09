import type { ComponentObjectPropsOptions, ComponentPropsOptions, ComponentPublicInstance, CreateAppFunction, EmitsOptions, ObjectEmitsOptions, resolveDynamicComponent } from 'vue'

// 5.26 UTS CLI typeRoots 内置了空的 uni-app 模块，遮蔽 npm 包的声明。
// 仅补齐编译器生成且运行时实际导出的 helper，不替代原生端类型系统。
declare module '@dcloudio/uni-app' {
  export function resolveEasycom(component: unknown, easycom: unknown): ReturnType<typeof resolveDynamicComponent>
}

// UTS CLI 的 runtime-core 类型入口缺少这些 dist-x Web 运行时导出。
declare module 'vue' {
  export const createApp: CreateAppFunction<Element>
  export const createSSRApp: CreateAppFunction<Element>
  export const createVueApp: CreateAppFunction<Element>
  export function useCssVars(getter: (ctx: ComponentPublicInstance) => Record<string, string>): void
  export function mergeModels(a: string[], b: string[]): string[]
  export function mergeModels(a: ComponentPropsOptions | EmitsOptions, b: ComponentPropsOptions | EmitsOptions): ComponentObjectPropsOptions | ObjectEmitsOptions
}
