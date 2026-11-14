// Public index of the admin-auth feature. Other code imports only from here.
// Admin features call the API through useAdminApi() (bearer token from the session).
export { SignInPage } from '@/features/admin-auth/SignInPage'
export { RequireAdminSession } from '@/features/admin-auth/RequireAdminSession'
export { AdminSessionMenu } from '@/features/admin-auth/AdminSessionMenu'
export { ViewOnlyNotice } from '@/features/admin-auth/ViewOnlyNotice'
export { useAdminApi, adminErrorMessage, adminApiBase, type AdminApi } from '@/features/admin-auth/adminApi'
export { useAdminSession, getAdminSession, setAdminSession, clearAdminSession, type AdminSession } from '@/features/admin-auth/session'
