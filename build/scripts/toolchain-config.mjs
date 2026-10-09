const patchedPackages = ['@dcloudio/uni-cli-shared', '@dcloudio/uni-h5-vue', '@dcloudio/uni-uts-v1', '@uni-helper/vite-plugin-uni-pages']

function versionParts(value) {
  const match = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(value || '')
  return match ? match.slice(1).map(part => Number(part || 0)) : null
}

function satisfies(version, range) {
  const actual = versionParts(version)
  if (!actual || typeof range !== 'string')
    return false
  return range.trim().split(/\s+/).every((clause) => {
    const match = /^(>=|<=|[><=])?(\d+(?:\.\d+){0,2})$/.exec(clause)
    if (!match)
      return false
    const wanted = versionParts(match[2])
    const index = actual.findIndex((part, i) => part !== wanted[i])
    const delta = index < 0 ? 0 : actual[index] - wanted[index]
    return { '>=': delta >= 0, '<=': delta <= 0, '>': delta > 0, '<': delta < 0, '=': delta === 0 }[match[1] || '=']
  })
}

/**
 * @param {{ packageJson: any, workspace: any, nodeVersion: string, pnpmVersion: string, patchFiles: string[], installedVersions?: Record<string, string>, hbuilderxVersion?: string }} config
 */
export function validateToolchain({ packageJson, workspace, nodeVersion, pnpmVersion, patchFiles, installedVersions = {}, hbuilderxVersion }) {
  const errors = []
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }
  for (const [name, version, range] of [
    ['Node', nodeVersion, packageJson.engines?.node],
    ['pnpm', pnpmVersion, packageJson.engines?.pnpm]
  ]) {
    if (range && !satisfies(version, range))
      errors.push(`${name} ${version || 'unavailable'} does not satisfy configured ${range}`)
  }
  const manager = /^pnpm@([^+]+)/.exec(packageJson.packageManager || '')
  if (manager && manager[1] !== pnpmVersion)
    errors.push(`pnpm ${pnpmVersion || 'unavailable'} differs from packageManager ${manager[1]}`)

  const dcloud = Object.entries(dependencies).filter(([name]) => /^@dcloudio\/(?:uni-|vite-plugin-uni)/.test(name))
  if (new Set(dcloud.map(([, version]) => version)).size > 1)
    errors.push('DCloud compiler/runtime package versions must be aligned')
  if (dcloud.some(([, version]) => !/^3\.0\.0-\d+$/.test(version)))
    errors.push('DCloud compiler/runtime versions must pin an exact matching release')
  for (const [name, version] of Object.entries(workspace.overrides || {})) {
    if (name.startsWith('@vue/') && version !== dependencies.vue)
      errors.push(`Vue override ${name}@${version} differs from vue@${dependencies.vue}`)
  }
  for (const name of patchedPackages) {
    if (dependencies[name] && !workspace.patchedDependencies?.[`${name}@${dependencies[name]}`])
      errors.push(`required patch declaration missing for ${name}@${dependencies[name]}`)
  }
  for (const [name, file] of Object.entries(workspace.patchedDependencies || {})) {
    if (!patchFiles.includes(file))
      errors.push(`patch file missing for ${name}: ${file}`)
  }
  for (const [name, installed] of Object.entries(installedVersions)) {
    const configured = dependencies[name] || workspace.overrides?.[name]
    if (configured && installed !== configured)
      errors.push(`installed ${name}@${installed || 'missing'} differs from configured ${configured}`)
  }
  if (hbuilderxVersion !== undefined && !/\b5\.26(?:\.|\b)/.test(hbuilderxVersion))
    errors.push(`HBuilderX CLI must be 5.26; got ${hbuilderxVersion || 'unavailable'}`)
  return errors
}
