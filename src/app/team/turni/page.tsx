import { permanentRedirect } from 'next/navigation'

export default function TeamTurniRedirectPage() {
  permanentRedirect('/shifts')
}
