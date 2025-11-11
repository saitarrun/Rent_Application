export type MailPayload = {
  to: string;
  subject: string;
  body: string;
};

export async function sendMail(payload: MailPayload) {
  // In production wire into SES/Sendgrid. For now just log for observability.
  console.info('[mailer]', payload.subject, '=>', payload.to);
  console.debug(payload.body);
}
