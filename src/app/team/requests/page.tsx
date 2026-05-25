import { redirect } from 'next/navigation'

export default function TeamRequestsRedirectPage() {
  redirect('/approvals?tab=candidatures')
}
