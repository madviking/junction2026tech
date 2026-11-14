/**
 * Everything visual comes from src/shared/ui. In any file under src/ outside
 * src/shared/ui/ (features, app, tests) this rule reports:
 * (a) imports from @mantine/core (use @/shared/ui; @mantine/hooks is fine),
 * (b) .css imports,
 * (c) JSX `style` attributes,
 * (d) hex colours and rgb()/hsl() colour functions in strings and templates,
 * (e) raw style props (c, bg, p, m, w, className, color, ...) on any JSX element.
 * See src/shared/ui/README.md. Tests: src/shared/ui/noRawStyles.lint.test.ts.
 */

const BANNED_PROPS = new Set([
  'c', 'bg', 'fz', 'fw', 'ff', 'lh', 'ta', 'tt', 'td',
  'p', 'px', 'py', 'pt', 'pb', 'ps', 'pe',
  'm', 'mx', 'my', 'mt', 'mb', 'ms', 'me',
  'w', 'h', 'miw', 'maw', 'mih', 'mah',
  'pos', 'top', 'left', 'right', 'bottom', 'inset', 'display', 'opacity',
  'bd', 'bdrs', 'style', 'styles', 'classNames', 'className', 'fontSize', 'color',
])

const HEX = '#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})'
// The whole string is a colour (`#fff`, `#1b7590`).
const EXACT_HEX_RE = new RegExp(`^\\s*${HEX}\\s*$`, 'i')
// A colour inside CSS-like text (`1px solid #ccc`). Short all-digit tokens like `#123`
// are skipped here so "Issue #123" stays legal.
const EMBEDDED_HEX_RE = /(?:^|[\s:(,])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]*[a-f][0-9a-f]*)(?![0-9a-z_-])/i
const COLOR_FN_RE = /\b(?:rgba?|hsla?)\s*\(/i

const isColorString = (value) => {
  if (EXACT_HEX_RE.test(value) || COLOR_FN_RE.test(value)) return true
  const match = EMBEDDED_HEX_RE.exec(value)
  return Boolean(match) && [3, 4, 6, 8].includes(match[0].replace(/^[^#]*#/, '').length)
}

const isCssImport = (source) => /\.css(?:\?.*)?$/.test(source)

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Keep styling inside src/shared/ui: no Mantine, CSS, inline styles, colours or style props elsewhere' },
    schema: [],
    messages: {
      mantineImport: "Import UI from '@/shared/ui', not '@mantine/core'. Add a primitive there if one is missing.",
      cssImport: 'CSS lives in src/shared/ui. Use or add a primitive instead of importing a stylesheet.',
      styleAttribute: 'No inline `style`. Use a primitive and its typed props (variant, tone, gap).',
      rawColor: 'Raw colour value. Colours are tokens in src/shared/ui/tokens.ts; use a primitive `tone`.',
      styleProp: "Raw style prop '{{name}}'. Use a primitive's typed props (variant, tone, gap) instead.",
    },
  },
  create(context) {
    const filename = context.filename.replaceAll('\\', '/')
    if (!filename.includes('/src/') || filename.includes('/src/shared/ui/')) return {}

    const checkSource = (node) => {
      const source = node.source && typeof node.source.value === 'string' ? node.source.value : null
      if (!source) return
      if (source === '@mantine/core' || source.startsWith('@mantine/core/')) {
        context.report({ node: node.source, messageId: 'mantineImport' })
      } else if (isCssImport(source)) {
        context.report({ node: node.source, messageId: 'cssImport' })
      }
    }

    return {
      ImportDeclaration: checkSource,
      ExportNamedDeclaration: checkSource,
      ExportAllDeclaration: checkSource,
      ImportExpression(node) {
        if (node.source.type === 'Literal' && typeof node.source.value === 'string') checkSource(node)
      },
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier') return
        const name = node.name.name
        if (name === 'style') {
          context.report({ node, messageId: 'styleAttribute' })
        } else if (BANNED_PROPS.has(name)) {
          context.report({ node, messageId: 'styleProp', data: { name } })
        }
      },
      Literal(node) {
        if (typeof node.value === 'string' && isColorString(node.value)) {
          context.report({ node, messageId: 'rawColor' })
        }
      },
      TemplateElement(node) {
        if (isColorString(node.value.cooked ?? node.value.raw)) {
          context.report({ node, messageId: 'rawColor' })
        }
      },
    }
  },
}
