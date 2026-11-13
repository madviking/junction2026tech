/**
 * API request/response shapes come from the generated src/shared/api/client.ts.
 * Flags local `*Request`, `*Response`, `*Dto` types and interfaces unless they are
 * aliases into a generated service namespace (for example `health.HealthStatus`).
 */

const SUFFIX_RE = /(Request|Response|Dto|DTO)$/
// `service.Type`: a qualified name can only come from the generated client's namespaces.
const referencesGenerated = (typeNode) =>
  typeNode?.type === 'TSTypeReference' && typeNode.typeName?.type === 'TSQualifiedName'

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow hand-written API contract types' },
    schema: [],
    messages: {
      localContract:
        "'{{name}}' looks like an API contract type. Use the generated client types (make api) instead.",
    },
  },
  create(context) {
    const filename = context.filename.replaceAll('\\', '/')
    if (filename.endsWith('/src/shared/api/client.ts')) return {}

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
