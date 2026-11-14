/**
 * Feature boundaries (src/features/<name>/):
 * - A feature may import another feature only through its public index
 *   (`@/features/<other>`), never its internals (`@/features/<other>/...`).
 * - Resident features never import admin features (`admin-*`), so admin code stays
 *   out of the resident bundle.
 * - No relative imports that leave the feature folder.
 * Composition (src/app/) may import features (public index only).
 */

const FEATURE_RE = /\/src\/features\/([^/]+)\//

const featureOfFile = (filename) => {
  const match = filename.replaceAll('\\', '/').match(FEATURE_RE)
  return match ? match[1] : null
}

const parseFeatureImport = (source) => {
  const match = source.match(/^@\/features\/([^/]+)(\/.*)?$/)
  return match ? { name: match[1], deep: Boolean(match[2]) } : null
}

const isAdmin = (name) => name.startsWith('admin-')
// Lazy-loaded staff screens (gallery, county) may use admin primitives; they are their own chunks.
const mayUseAdminUi = (name) => isAdmin(name) || name === 'design-system' || name === 'county'

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Enforce feature module boundaries' },
    schema: [],
    messages: {
      internals:
        "Import feature '{{to}}' through its public index (@/features/{{to}}), not its internals.",
      residentToAdmin: "Resident feature '{{from}}' must not import admin feature '{{to}}'.",
      residentToAdminUi: "Resident feature '{{from}}' must not import @/shared/ui/admin (admin primitives stay out of the resident bundle).",
      relativeEscape:
        "Feature '{{from}}' must not reach outside its folder with relative imports. Use @/shared/...",
    },
  },
  create(context) {
    const filename = context.filename.replaceAll('\\', '/')
    const from = featureOfFile(filename)
    const inApp = filename.includes('/src/app/')
    if (!from && !inApp) return {}

    const check = (node) => {
      const source = String(node.source?.value ?? '')
      const target = parseFeatureImport(source)
      if (target && target.name !== from) {
        if (target.deep) context.report({ node: node.source, messageId: 'internals', data: { to: target.name } })
        if (from && !isAdmin(from) && isAdmin(target.name)) {
          context.report({ node: node.source, messageId: 'residentToAdmin', data: { from, to: target.name } })
        }
      }
      if (from && !mayUseAdminUi(from) && source.startsWith('@/shared/ui/admin')) {
        context.report({ node: node.source, messageId: 'residentToAdminUi', data: { from } })
      }
      if (from && source.startsWith('../')) {
        const resolved = new URL(source, `file://${filename}`).pathname
        if (featureOfFile(resolved) !== from) {
          context.report({ node: node.source, messageId: 'relativeEscape', data: { from } })
        }
      }
    }

    return { ImportDeclaration: check, ExportNamedDeclaration: check, ExportAllDeclaration: check, ImportExpression: (node) => check({ source: node.source }) }
  },
}
