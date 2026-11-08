import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { expect, it } from 'vitest'
import en from './locales/en.json'
import { countryCodeOptions } from '@/features/users/phone-number'
import es from './locales/es.json'

// Check source keys as well as dictionary parity: matching dictionaries alone
// cannot detect screens that silently fall back to untranslated English.
it('provides English and Spanish resources for static UI translation keys and choices', () => {
  const missing = new Set<string>()
  function check(key: string, file: string) {
    key = key.trim()
    // Language names stay in their own language so users can find the picker.
    if (file.endsWith('language-provider.tsx') && ['English', 'Español'].includes(key)) return
    if (!key || !/[a-z]/i.test(key) || key.startsWith('{"')) return
    for (const [lang, resources] of [
      ['en', en],
      ['es', es],
    ] as const) {
      if (!(key in resources) && !(`${key}_one` in resources && `${key}_other` in resources))
        missing.add(`${path.relative('src', file)}: ${lang}: ${key}`)
    }
  }
  function checkExpression(node: ts.Node, file: string) {
    if (ts.isStringLiteralLike(node)) check(node.text, file)
    if (ts.isConditionalExpression(node)) {
      checkExpression(node.whenTrue, file)
      checkExpression(node.whenFalse, file)
    }
  }
  function scan(directory: string) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== 'locales') scan(file)
        continue
      }
      if (!/\.tsx?$/.test(file) || /\.(test|fixtures)\./.test(file) || file.includes('mock-data'))
        continue
      const source = ts.createSourceFile(
        file,
        fs.readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
      )
      function visit(node: ts.Node) {
        if (
          ts.isCallExpression(node) &&
          node.expression.getText(source) === 't' &&
          node.arguments[0]
        )
          checkExpression(node.arguments[0], file)
        // Shared components translate these props at their render boundary.
        if (
          ts.isJsxAttribute(node) &&
          ['label', 'title', 'description', 'placeholder', 'aria-label'].includes(
            node.name.getText(source),
          ) &&
          node.initializer &&
          ts.isStringLiteral(node.initializer)
        )
          check(node.initializer.text, file)
        if (
          ts.isPropertyAssignment(node) &&
          ['label', 'title', 'description', 'caption'].includes(node.name.getText(source))
        )
          checkExpression(node.initializer, file)
        ts.forEachChild(node, visit)
      }
      visit(source)
    }
  }
  scan('src')
  for (const option of countryCodeOptions)
    check(option.label.replace(/ \(\+\d+\)$/, ''), 'src/features/users/phone-number.ts')
  expect([...missing].sort()).toEqual([])
})
