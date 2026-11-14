import { useNavigate } from 'react-router'
import { useAdminSession } from '@/features/admin-auth'
import { ActionButton, Grid, Section, Stack, SurfaceCard, Text } from '@/shared/ui'

const sections = [
  { to: '/admin/content', title: 'Content', description: 'Edit texts in every language, mark reviews, publish the draft.' },
  { to: '/admin/versions', title: 'Versions', description: 'Published versions, roll back, export rules.yaml.' },
  { to: '/admin/audio', title: 'Audio', description: 'Generated audio and human recordings per text, approve recordings.' },
  { to: '/admin/usage', title: 'Usage and audit', description: 'Paid provider spend and the audit log of admin actions.' },
] as const

/** Admin home: links to the four tools. */
export function AdminHome() {
  const navigate = useNavigate()
  const session = useAdminSession()
  return (
    <Stack gap="lg">
      <Section
        level={1}
        eyebrow="Admin"
        title="Overview"
        description={session ? `Signed in as ${session.user.displayName} (${session.user.email}).` : undefined}
      >
        <Grid min="md">
          {sections.map((section) => (
            <SurfaceCard key={section.to} as="article">
              <Stack gap="sm" align="start">
                <Text variant="heading" as="h2">
                  {section.title}
                </Text>
                <Text tone="muted">{section.description}</Text>
                <ActionButton variant="secondary" compact onPress={() => navigate(section.to)}>
                  {`Open ${section.title.toLowerCase()}`}
                </ActionButton>
              </Stack>
            </SurfaceCard>
          ))}
        </Grid>
      </Section>
    </Stack>
  )
}
