/**
 * Proves lint rule `local/no-raw-styles` (eslint-rules/no-raw-styles.js) through the
 * real eslint.config.js, so the registration and the `error` level are tested too.
 * Lives here because vitest only collects `src/**` tests; src/shared/ui is exempt from
 * the rule, so the banned snippets below do not trip it.
 */
import path from 'node:path'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const frontendRoot = `${path.resolve(import.meta.dirname, '../../..')}/`
const eslint = new ESLint({ cwd: frontendRoot })

async function rawStyleErrors(code: string, file = 'src/features/demo/Demo.tsx') {
  const [result] = await eslint.lintText(code, { filePath: `${frontendRoot}${file}` })
  return (result?.messages ?? [])
    .filter((message) => message.ruleId === 'local/no-raw-styles')
    .map((message) => ({ severity: message.severity, text: message.message }))
}

const banned: Array<[string, string]> = [
  ['an @mantine/core import', "import { Button } from '@mantine/core'\nexport const x = Button"],
  ['an @mantine/core type import', "import type { MantineColor } from '@mantine/core'\nexport type X = MantineColor"],
  ['a .css import', "import './Demo.css'"],
  ['a .module.css import', "import classes from './Demo.module.css'\nexport const x = classes"],
  ['a JSX style attribute', 'export const X = () => <div style={{ margin: 4 }} />'],
  ['a hex colour', "export const brand = '#1b7590'"],
  ['a short hex colour', "export const brand = '#fff'"],
  ['a hex colour inside a string', "export const border = '1px solid #ccc'"],
  ['an rgb() colour', "export const shade = 'rgba(0, 0, 0, 0.5)'"],
  ['an hsl() colour in a template', 'export const shade = `hsl(${120}, 50%, 50%)`'],
  ['a c prop', "import { Text } from '@/shared/ui'\nexport const X = () => <Text c=\"red\">x</Text>"],
  ['a p prop', "import { Stack } from '@/shared/ui'\nexport const X = () => <Stack p=\"md\">x</Stack>"],
  ['a className prop', 'export const X = () => <div className="x" />'],
  ['a color prop', 'export const X = ({ Icon }) => <Icon color="red" />'],
  ['a styles prop', 'export const X = ({ C }) => <C styles={{}} />'],
  ['a display prop', 'export const X = ({ C }) => <C display="none" />'],
]

describe('local/no-raw-styles', () => {
  it.each(banned)('errors on %s in a feature', async (_name, code) => {
    const errors = await rawStyleErrors(code)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.every((error) => error.severity === 2)).toBe(true)
  })

  it('applies to src/app and to tests', async () => {
    const code = "import { MantineProvider } from '@mantine/core'\nexport const x = MantineProvider"
    expect(await rawStyleErrors(code, 'src/app/App.tsx')).toHaveLength(1)
    expect(await rawStyleErrors(code, 'src/features/demo/Demo.test.tsx')).toHaveLength(1)
  })

  it('allows anything inside src/shared/ui', async () => {
    const code = "import { Box } from '@mantine/core'\nimport c from './x.module.css'\nexport const X = () => <Box c=\"#fff\" className={c.root} style={{ top: 0 }} />"
    expect(await rawStyleErrors(code, 'src/shared/ui/layout/Example.tsx')).toEqual([])
  })

  it('passes a clean feature that composes primitives', async () => {
    const code = [
      "import { useDisclosure } from '@mantine/hooks'",
      "import { IconVolume } from '@tabler/icons-react'",
      "import { ActionButton, ChoiceCard, Stack, Text } from '@/shared/ui'",
      'export function Demo() {',
      '  const [opened, { toggle }] = useDisclosure(false)',
      '  return (',
      '    <Stack gap="md">',
      '      <Text variant="title" tone="muted">Issue #123</Text>',
      '      <ChoiceCard label="Suomi" icon={<IconVolume size={24} />} selected={opened} onPress={toggle} />',
      '      <ActionButton variant="primary" fullWidth onPress={toggle}>Continue</ActionButton>',
      '    </Stack>',
      '  )',
      '}',
    ].join('\n')
    expect(await rawStyleErrors(code)).toEqual([])
  })
})
