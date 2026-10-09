import uniHelper from '@uni-helper/eslint-config'

const composer = uniHelper({
  stylistic: {
    semi: false,
    indent: 2,
    quotes: 'single'
  },
  unocss: false,
  vue: true,
  markdown: false,
  ignores: [
    '**/uni_modules/',
    '**/nativeplugins/',
    '**/unpackage/',
    '**/dist/',
    '**/test-results/',
    '**/.hx-tmp/',
    '**/auto-imports.d.ts',
    '**/uni-pages.d.ts',
    '**/pages.json',
    '**/manifest.json',
    '**/platformConfig.json'
  ],
  rules: {
    'style/comma-dangle': ['error', 'never'],
    'vue/comma-dangle': ['error', 'never'],
    'vue/html-self-closing': 'off',
    // uvue 中短文本行内写法更紧凑常见（RiceUI 示例风格）
    'vue/singleline-html-element-content-newline': 'off',
    'vue/v-slot-style': 'off',
    'vue/no-deprecated-slot-attribute': 'off',
    'no-console': 'off',
    'eqeqeq': 'off',
    'vue/eqeqeq': 'off',
    'no-useless-return': 'off',
    'node/prefer-global/process': 'off',
    'ts/no-redeclare': 'off',
    'ts/consistent-type-definitions': 'off',
    'ts/no-empty-object-type': 'off',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_'
      }
    ],
    // uni 条件编译注释可能包裹 import，自动排序会破坏平台条件边界
    'perfectionist/sort-imports': 'off',
    'vue/comment-directive': 'off',
    'no-irregular-whitespace': 'off',
    'vue/no-irregular-whitespace': [
      'error',
      {
        skipStrings: true,
        skipComments: true,
        skipRegExps: true,
        skipHTMLTextContents: true
      }
    ],
    'vue/block-order': ['error', { order: [['script', 'template'], 'style'] }]
  }
})

// 让 eslint 把 .uvue / .uts 按 .vue / .ts 处理
const configs = await composer

for (const config of configs) {
  if (config.files) {
    const files = Array.isArray(config.files) ? config.files : [config.files]
    const newFiles = [...files]
    let matched = false
    for (const file of files) {
      if (typeof file === 'string') {
        if (file.includes('vue')) {
          newFiles.push('**/*.uvue')
          matched = true
        }
        if (file.includes('ts') || file.includes('[jt]s')) {
          newFiles.push('**/*.uts')
          matched = true
        }
      }
    }
    if (matched) {
      config.files = [...new Set(newFiles)]
    }
  }

  if (config.languageOptions?.parserOptions?.extraFileExtensions) {
    const exts = config.languageOptions.parserOptions.extraFileExtensions
    if (!exts.includes('.uvue'))
      exts.push('.uvue')
    if (!exts.includes('.uts'))
      exts.push('.uts')
  }

  // 解析 .uvue 时临时替换扩展名为 .vue
  if (config.languageOptions?.parser && typeof config.languageOptions.parser.parseForESLint === 'function') {
    const originalParser = config.languageOptions.parser
    config.languageOptions.parser = {
      ...originalParser,
      parseForESLint(code, options) {
        const originalFilePath = options.filePath
        if (options.filePath?.endsWith('.uvue')) {
          options.filePath = options.filePath.replace(/\.uvue$/, '.vue')
        }
        try {
          return originalParser.parseForESLint(code, options)
        }
        finally {
          options.filePath = originalFilePath
        }
      }
    }
  }

  // 让所有 vue 规则按 .vue 文件名处理 .uvue
  if (config.plugins?.vue?.rules) {
    for (const ruleName of Object.keys(config.plugins.vue.rules)) {
      const originalRule = config.plugins.vue.rules[ruleName]
      if (originalRule && typeof originalRule.create === 'function') {
        config.plugins.vue.rules[ruleName] = {
          ...originalRule,
          create(context) {
            const wrappedContext = Object.create(context, {
              filename: {
                get() {
                  return context.filename?.endsWith('.uvue')
                    ? context.filename.replace(/\.uvue$/, '.vue')
                    : context.filename
                },
                configurable: true
              },
              getFilename: {
                value() {
                  const name = context.getFilename()
                  return name?.endsWith('.uvue') ? name.replace(/\.uvue$/, '.vue') : name
                },
                configurable: true
              }
            })
            return originalRule.create(wrappedContext)
          }
        }
      }
    }
  }
}

configs.push({
  files: ['**/*.vue', '**/*.uvue', '**/*.uts', '**/*.ts', '**/*.js'],
  rules: {
    'style/comma-dangle': ['error', 'never'],
    'vue/comma-dangle': ['error', 'never'],
    'vue/no-undef-components': [
      'warn',
      {
        ignorePatterns: [
          // uni-app x 内置组件
          'view',
          'text',
          'image',
          'button',
          'input',
          'textarea',
          'scroll-view',
          'swiper',
          'swiper-item',
          'list-view',
          'list-item',
          'sticky-section',
          'sticky-header',
          'refresh-box',
          'refresh-header',
          'waterflow',
          'flow-item',
          'nested-scroll-header',
          'nested-scroll-body',
          'movable-area',
          'movable-view',
          'cover-view',
          'cover-image',
          'root-portal',
          'picker',
          'picker-view',
          'picker-view-column',
          'switch',
          'slider',
          'radio',
          'radio-group',
          'checkbox',
          'checkbox-group',
          'form',
          'label',
          'navigator',
          'web-view',
          'video',
          'camera',
          'map',
          'canvas',
          'slot',
          'template',
          'component',
          // easycom 组件库
          'rice-*',
          'z-paging-x',
          'z-paging-x-empty',
          'up-*',
          'u-*',
          'lime-*'
        ]
      }
    ]
  },
  languageOptions: {
    globals: {
      // uni-app x 全局对象与编译宏
      uni: 'readonly',
      plus: 'readonly',
      UTSJSONObject: 'readonly',
      definePage: 'readonly',
      defineProps: 'readonly',
      defineEmits: 'readonly',
      defineExpose: 'readonly',
      defineOptions: 'readonly',
      defineSlots: 'readonly',
      defineModel: 'readonly',
      withDefaults: 'readonly',
      // 页面生命周期
      onInit: 'readonly',
      onLoad: 'readonly',
      onShow: 'readonly',
      onReady: 'readonly',
      onHide: 'readonly',
      onUnload: 'readonly',
      onPullDownRefresh: 'readonly',
      onReachBottom: 'readonly',
      onBackPress: 'readonly',
      onPageScroll: 'readonly',
      onResize: 'readonly',
      onTabItemTap: 'readonly',
      onShareAppMessage: 'readonly',
      onShareTimeline: 'readonly',
      onAddToFavorites: 'readonly',
      getCurrentPages: 'readonly',
      getApp: 'readonly'
    }
  }
})

export default configs
