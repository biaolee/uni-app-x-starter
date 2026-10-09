# components

业务公共组件目录，遵循 easycom 自动导入约定：

```
components/
└── app-layout/
    └── app-layout.uvue   # 目录名与文件名一致
```

页面中可直接使用 `<app-layout />`，**无需手写 import**（此组件的映射在 `pages.config.json` 中声明）。

规则：

1. 组件目录名 = 组件文件名，使用多单词 kebab-case（避免与 HTML/RiceUI 标签冲突）；不能由 easycom 自动识别时，在 `pages.config.json` 声明映射
2. `components` 下的组件只在本工程生效；`uni_modules` 用于可跨项目复用的插件型组件
3. 组件内部使用 RiceUI 时直接写 `<rice-*>`，同样无需 import
