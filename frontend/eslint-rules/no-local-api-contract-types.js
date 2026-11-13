/**
 * API request/response shapes come from src/shared/api/generated/openapi.ts.
 * Flags local `*Request`, `*Response`, `*Dto` types and interfaces unless they are
 * aliases into the generated `components` / `paths` / `operations` types.
 */

const SUFFIX_RE = /(Request|Response|Dto|DTO)$/
const OPENAPI_ROOTS = new Set(['components', 'paths', 'operations', 'Schemas'])

const referencesGenerated = (typeNode) => {
  let node = typeNode
  while (node && node.type === 'TSIndexedAccessType') node = node.objectType
  return Boolean(
    node && node.type === 'TSTypeReference' && node.typeName?.type === 'Identifier' &&
      OPENAPI_ROOTS.has(node.typeName.name),
  )
}

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow hand-written API contract types' },
    schema: [],
    messages: {
      localContract:
        "'{{name}}' looks like an API contract type. Use the generated OpenAPI types (make api) instead.",
    },
  },
  create(context) {
    const filename = context.filename.replaceAll('\\', '/')
    if (filename.includes('/src/shared/api/generated/')) return {}

    return {
      TSInterfaceDeclaration(node) {
        if (SUFFIX_RE.test(node.id.name)) {
          context.report({ node: node.id, messageId: 'localContract', data: { name: node.id.name } })
        }
      },
      TSTypeAliasDeclaration(node) {
        if (SUFFIX_RE.test(node.id.name) && !referencesGenerated(node.typeAnnotation)) {
          context.report({ node: node.id, messageId: 'localContract', data: { name: node.id.name } })
        }
      },
    }
  },
}
