import { existsSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

export const resolveCommentsJson = (content: string) => {
  const contentWithoutComments = content.replace(
    /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g,
    (m, g) => (g ? '' : m),
  )
  return JSON.parse(contentWithoutComments)
}

export const requireJSON = (url: string) => {
  const content = readFileSync(url, 'utf-8')
  return resolveCommentsJson(content)
}

export const pascalCase = (str: string) => {
  if (!str || typeof str !== 'string') return ''

  const words = str
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')

  const pascalCase = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')

  return pascalCase
}

export const genRelativePath = (from: string, to: string) => {
  const relativePath = relative(from, to)
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`
}

export const resolveNodeModulePath = (
  root: string,
  pattern: string,
): string => {
  const parts = pattern.split('/')
  let packageName: string
  let subpath: string

  if (parts[0].startsWith('@')) {
    packageName = parts.slice(0, 2).join('/')
    subpath = parts.slice(2).join('/')
  } else {
    packageName = parts[0]
    subpath = parts.slice(1).join('/')
  }

  if (!subpath) return pattern

  const pkgJsonPath = join(root, 'node_modules', packageName, 'package.json')
  if (!existsSync(pkgJsonPath)) return pattern

  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
  const exports = pkgJson.exports
  if (!exports) return pattern

  const normalizedSubpath = subpath.startsWith('.') ? subpath : `./${subpath}`

  for (const [patternKey, target] of Object.entries(exports)) {
    if (!patternKey.includes('*')) {
      if (normalizedSubpath === patternKey) {
        const resolved =
          typeof target === 'string'
            ? target
            : target.import || target.default
        if (resolved) {
          const resolvedSubpath = resolved.replace(/^\.\//, '')
          return `${packageName}/${resolvedSubpath}`
        }
      }
      continue
    }

    const prefix = patternKey.replace(/\*$/, '')
    if (normalizedSubpath.startsWith(prefix)) {
      const suffix = normalizedSubpath.slice(prefix.length)
      const resolved =
        typeof target === 'string'
          ? target
          : target.import || target.default
      if (resolved) {
        const resolvedBase = resolved.replace(/\*$/, '')
        const resolvedSubpath = (resolvedBase + suffix).replace(/^\.\//, '')
        return `${packageName}/${resolvedSubpath}`
      }
    }
  }

  return pattern
}
