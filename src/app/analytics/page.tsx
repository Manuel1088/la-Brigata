import { permanentRedirect } from 'next/navigation'

export default function AnalyticsPage() {
  permanentRedirect('/reports?tab=dashboard')
}
