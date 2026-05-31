/**
 * Invio invito di registrazione al nuovo dipendente (Resend opzionale).
 * Senza RESEND_API_KEY: log in server + emailSent: false (il manager può
 * comunque condividere il link manualmente).
 */

export interface InviteEmailPayload {
  to: string
  employeeName: string
  inviterName: string
  restaurantName: string
  inviteUrl: string
}

export async function sendEmployeeInviteEmail(
  payload: InviteEmailPayload
): Promise<{ emailSent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const from =
    process.env.EMPLOYEE_WELCOME_EMAIL_FROM ??
    'La Brigata <onboarding@labrigata.it>'

  if (!apiKey) {
    console.info(
      '[employee-invite] RESEND_API_KEY assente — invito non inviato via email:',
      { to: payload.to, inviteUrl: payload.inviteUrl }
    )
    return { emailSent: false, error: 'Servizio email non configurato' }
  }

  const html = `
    <h2>Sei stato invitato su La Brigata</h2>
    <p>Ciao <strong>${escapeHtml(payload.employeeName)}</strong>,</p>
    <p><strong>${escapeHtml(payload.inviterName)}</strong> ti ha aggiunto al team di
       <strong>${escapeHtml(payload.restaurantName)}</strong> su La Brigata.</p>
    <p>Completa la registrazione cliccando qui sotto e scegliendo la tua password:</p>
    <p>
      <a href="${escapeHtml(payload.inviteUrl)}"
         style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
        Registrati ora
      </a>
    </p>
    <p style="color:#666;font-size:13px">Oppure copia questo link: ${escapeHtml(payload.inviteUrl)}</p>
    <p style="color:#666;font-size:13px">Il link è valido per 7 giorni.</p>
  `

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: `${payload.inviterName} ti ha aggiunto su La Brigata`,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('[employee-invite] Resend error:', res.status, body)
      return { emailSent: false, error: 'Invio email fallito' }
    }

    return { emailSent: true }
  } catch (err) {
    console.error('[employee-invite] fetch error:', err)
    return {
      emailSent: false,
      error: err instanceof Error ? err.message : 'Errore invio email',
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
