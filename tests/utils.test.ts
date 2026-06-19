import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { resolveCommentsJson, resolveNodeModulePath } from '../src/core/utils'

const testDir = join(__dirname, 'fixtures/utils-test')

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true })
})

test('test resolve json content', () => {
  const jsonWithoutComments = `{
    "a": 1,
    "b": 2
  }`
  expect(resolveCommentsJson(jsonWithoutComments)).toEqual({
    a: 1,
    b: 2,
  })

  const jsonWithComments = `{
    /** block comment a */
    "a": 1,
    /** block comment b */
    "b": 2 // line comment
  }
  `
  expect(resolveCommentsJson(jsonWithComments)).toEqual({
    a: 1,
    b: 2,
  })
})

test('resolveNodeModulePath with exports field', async () => {
  const pkgDir = join(testDir, 'node_modules', 'test-pkg')
  await mkdir(pkgDir, { recursive: true })

  await writeFile(
    join(pkgDir, 'package.json'),
    JSON.stringify({
      exports: {
        '.': { types: './dist/index.d.ts', import: './dist/index.mjs' },
        './components/*': {
          types: './dist/components/*.d.ts',
          import: './dist/components/*',
        },
        './utils': { types: './dist/utils.d.ts', import: './dist/utils.mjs' },
      },
    }),
  )

  const result1 = resolveNodeModulePath(
    testDir,
    'test-pkg/components/$1/$1.vue',
  )
  expect(result1).toBe('test-pkg/dist/components/$1/$1.vue')

  const result2 = resolveNodeModulePath(testDir, 'test-pkg/utils')
  expect(result2).toBe('test-pkg/dist/utils.mjs')

  const result3 = resolveNodeModulePath(testDir, 'test-pkg/unknown/path')
  expect(result3).toBe('test-pkg/unknown/path')
})

test('resolveNodeModulePath with scoped package', async () => {
  const pkgDir = join(testDir, 'node_modules', '@scope', 'test-pkg')
  await mkdir(pkgDir, { recursive: true })

  await writeFile(
    join(pkgDir, 'package.json'),
    JSON.stringify({
      exports: {
        './components/*': {
          import: './dist/components/*',
        },
      },
    }),
  )

  const result = resolveNodeModulePath(
    testDir,
    '@scope/test-pkg/components/$1/$1.vue',
  )
  expect(result).toBe('@scope/test-pkg/dist/components/$1/$1.vue')
})
