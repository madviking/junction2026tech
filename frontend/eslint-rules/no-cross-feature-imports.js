/**
 * A feature (src/features/<name>/) may import only from itself and from shared code.
 * Composition (src/app/) may import features. Ported from Queast's feature-boundary rule.
 */

const FEATURE_RE = /\/src\/features\/([^/]+)\//

const featureOfFile = (filename) => {
  const match = filename.replaceAll('\\', '/').match(FEATURE_RE)
  return match ? match[1] : null
}

const featureOfImport = (source) => {
  const match = source.match(/^@\/features\/([^/]+)/)
  return match ? match[1] : null
}

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow imports between feature modules' },
    schema: [],
    messages: {
      crossFeature:
        "Feature '{{from}}' must not import from feature '{{to}}'. Move shared code to src/shared/.",
      relativeEscape:
        "Feature '{{from}}' must not reach outside its folder with relative imports. Use @/shared/...",
    },
  },
  create(context) {
    const from = featureOfFile(context.filename)
    if (!from) return {}

    const check = (node) => {
      const source = String(node.source?.value ?? '')
      const to = featureOfImport(source)
      if (to && to !== from) {
        context.report({ node: node.source, messageId: 'crossFeature', data: { from, to } })
      }
      if (source.startsWith('../')) {
        const resolved = new URL(source, `file://${context.filename.replaceAll('\\', '/')}`).pathname
        if (featureOfFile(resolved) !== from) {
          context.report({ node: node.source, messageId: 'relativeEscape', data: { from } })
        }
      }
    }

    return { ImportDeclaration: check, ExportNamedDeclaration: check, ExportAllDeclaration: check }
  },
}
