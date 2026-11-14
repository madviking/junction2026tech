const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 })
const count = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'medium' })

export const formatUsd = (value: number) => usd.format(value)
export const formatCount = (value: number) => count.format(value)
export function formatDateTime(iso: string) {
  const at = new Date(iso)
  return Number.isNaN(at.getTime()) ? iso : dateTime.format(at)
}
