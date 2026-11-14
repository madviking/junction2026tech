import { useAdminSession } from '@/features/admin-auth/session'
import { useViewOnlyRefusalVisible } from '@/features/admin-auth/viewOnlyRefusal'
import { Banner, FloatingNotice } from '@/shared/ui'

/**
 * For a view-only admin (the public demo account): a banner on every page, and a short
 * "Not saved" message whenever the backend refuses a change.
 */
export function ViewOnlyNotice() {
  const session = useAdminSession()
  const refused = useViewOnlyRefusalVisible()
  if (session?.user.role !== 'viewer') return null
  return (
    <>
      <Banner tone="info" title="View-only demo">
        You can open every page and form, but saving, publishing, approving and generating are turned off for this account.
      </Banner>
      <FloatingNotice>
        {refused && (
          <Banner tone="warning" title="Not saved">
            This demo account is view-only, so the change was not saved.
          </Banner>
        )}
      </FloatingNotice>
    </>
  )
}
