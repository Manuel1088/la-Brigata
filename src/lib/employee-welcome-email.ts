/**
 * Invio credenziali al nuovo dipendente (Resend opzionale).
 * Senza RESEND_API_KEY: log in server + emailSent: false (il manager vede le credenziali in UI).
 */

export interface WelcomeEmailPayload {
  to: string
  employeeName: string
  restaurantName: string
  temporaryPassword: string
  loginUrl: string
}

export async function sendEmployeeWelcomeEmail(
  payload: WelcomeEmailPayload
): Promise<{ emailSent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const from =
    process.env.EMPLOYEE_WELCOME_EMAIL_FROM ??
    'La Brigata <onboarding@labrigata.it>'

  if (!apiKey) {
    console.info(
      '[employee-welcome] RESEND_API_KEY assente — credenziali non inviate via email:',
      { to: payload.to, loginUrl: payload.loginUrl }
    )
    return { emailSent: false, error: 'Servizio email non configurato' }
  }

  const html = `
    <h2>Benvenuto in La Brigata</h2>
    <p>Ciao <strong>${escapeHtml(payload.employeeName)}</strong>,</p>
    <p>Il tuo account per <strong>${escapeHtml(payload.restaurantName)}</strong> è stato creato.</p>
    <ul>
      <li><strong>Email:</strong> ${escapeHtml(payload.to)}</li>
      <li><strong>Password temporanea:</strong> ${escapeHtml(payload.temporaryPassword)}</li>
    </ul>
    <p>Accedi da: <a href="${escapeHtml(payload.loginUrl)}">${escapeHtml(payload.loginUrl)}</a></p>
    <p>Ti consigliamo di cambiare la password al primo accesso dal profilo.</p>
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
        subject: `Accesso La Brigata — ${payload.restaurantName}`,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('[employee-welcome] Resend error:', res.status, body)
      return { emailSent: false, error: 'Invio email fallito' }
    }

    return { emailSent: true }
  } catch (err) {
    console.error('[employee-welcome] fetch error:', err)
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
