import nodemailer from "nodemailer";
import { getAppOrigin } from "@/lib/patient-qr";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export function isEmailConfigured() {
  if (process.env.RESEND_API_KEY?.trim()) return true;
  if (process.env.BREVO_API_KEY?.trim()) return true;
  return !!(
    process.env.SMTP_HOST?.trim() &&
    process.env.SMTP_USER?.trim() &&
    process.env.SMTP_FROM?.trim()
  );
}

function fromAddress() {
  return (
    process.env.SMTP_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    process.env.CLINIC_EMAIL?.trim() ||
    "noreply@alwisam.dz"
  );
}

function clinicName() {
  return process.env.APP_NAME?.trim() || "عيادة الوسام لطب الأسنان";
}

async function sendViaResend(input: SendEmailInput) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return { provider: "resend" as const };
}

/** Brevo Transactional API (مفتاح xkeysib-...) — ليس Campaigns */
async function sendViaBrevo(input: SendEmailInput) {
  const key = process.env.BREVO_API_KEY?.trim();
  if (!key) return null;

  const from = fromAddress();
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": key,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: clinicName(), email: from },
      to: [{ email: input.to }],
      subject: input.subject,
      htmlContent: input.html,
      textContent: input.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return { provider: "brevo" as const };
}

async function sendViaSmtp(input: SendEmailInput) {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  if (!host || !user) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  const pass = process.env.SMTP_PASS?.trim();
  const secure =
    process.env.SMTP_SECURE === "true" || port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: pass || "" },
  });

  await transporter.sendMail({
    from: `"${clinicName()}" <${fromAddress()}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  return { provider: "smtp" as const };
}

/**
 * إرسال بريد — Resend ثم Brevo ثم SMTP.
 * يرمي خطأ إن لم يُضبط أي مزوّد أو فشل الإرسال.
 */
export async function sendEmail(input: SendEmailInput) {
  const to = input.to.trim().toLowerCase();
  if (!to || !to.includes("@")) {
    throw new Error("عنوان بريد غير صالح");
  }

  const viaResend = await sendViaResend({ ...input, to });
  if (viaResend) return viaResend;

  const viaBrevo = await sendViaBrevo({ ...input, to });
  if (viaBrevo) return viaBrevo;

  const viaSmtp = await sendViaSmtp({ ...input, to });
  if (viaSmtp) return viaSmtp;

  throw new Error(
    "البريد غير مضبوط — أضف BREVO_API_KEY أو RESEND_API_KEY أو SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM",
  );
}

function emailShell(title: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;background:#F5F8FC;font-family:Tahoma,Arial,sans-serif;color:#162033">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #DCE4EE;border-radius:16px;overflow:hidden">
        <tr><td style="background:linear-gradient(135deg,#0F2747,#176B87);padding:20px 24px;color:#fff">
          <p style="margin:0;font-size:14px;opacity:.85">${clinicName()}</p>
          <h1 style="margin:8px 0 0;font-size:20px">${title}</h1>
        </td></tr>
        <tr><td style="padding:24px;line-height:1.8;font-size:15px">${bodyHtml}</td></tr>
        <tr><td style="padding:0 24px 24px;font-size:12px;color:#667085">
          إن لم تطلب هذا الإجراء، تجاهل الرسالة. لا تشارك الرابط مع أحد.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetEmail(params: {
  to: string;
  fullName: string;
  token: string;
  portal: "staff" | "patient";
}) {
  const origin = getAppOrigin();
  const link = `${origin}/reset-password?token=${encodeURIComponent(params.token)}&portal=${params.portal}`;
  const subject = `استعادة كلمة المرور — ${clinicName()}`;
  const text = `مرحباً ${params.fullName}\n\nلاستعادة كلمة المرور افتح الرابط خلال ساعة:\n${link}\n`;
  const html = emailShell(
    "استعادة كلمة المرور",
    `<p>مرحباً <strong>${params.fullName}</strong>،</p>
     <p>طلبت استعادة كلمة المرور. اضغط الزر أدناه خلال ساعة واحدة:</p>
     <p style="margin:24px 0"><a href="${link}" style="display:inline-block;background:#0F9A9A;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:bold">تعيين كلمة مرور جديدة</a></p>
     <p style="font-size:12px;color:#667085;word-break:break-all">أو انسخ الرابط:<br/>${link}</p>`,
  );
  return sendEmail({ to: params.to, subject, html, text });
}

export async function sendAccountActivationEmail(params: {
  to: string;
  fullName: string;
  token: string;
}) {
  const origin = getAppOrigin();
  const link = `${origin}/activate-account?token=${encodeURIComponent(params.token)}`;
  const subject = `تفعيل حساب المريض — ${clinicName()}`;
  const text = `مرحباً ${params.fullName}\n\nلتفعيل حسابك افتح الرابط خلال 7 أيام:\n${link}\n`;
  const html = emailShell(
    "تفعيل حسابك",
    `<p>مرحباً <strong>${params.fullName}</strong>،</p>
     <p>أنشأت العيادة حساباً لمتابعة علاجك. فعّل الحساب واختر كلمة مرور:</p>
     <p style="margin:24px 0"><a href="${link}" style="display:inline-block;background:#0F9A9A;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:bold">تفعيل الحساب</a></p>
     <p style="font-size:12px;color:#667085;word-break:break-all">أو انسخ الرابط:<br/>${link}</p>`,
  );
  return sendEmail({ to: params.to, subject, html, text });
}

export async function sendEmailChangedNotice(params: {
  to: string;
  fullName: string;
  newEmail: string;
  loginUrl: string;
}) {
  const subject = `تحديث بريد الدخول — ${clinicName()}`;
  const text = `مرحباً ${params.fullName}\n\nتم تحديث بريد الدخول إلى: ${params.newEmail}\nالدخول: ${params.loginUrl}\n`;
  const html = emailShell(
    "تحديث بريد الدخول",
    `<p>مرحباً <strong>${params.fullName}</strong>،</p>
     <p>تم تحديث بريد الدخول لحسابك إلى:</p>
     <p style="font-weight:bold;direction:ltr;text-align:right">${params.newEmail}</p>
     <p>يمكنك الدخول من:</p>
     <p><a href="${params.loginUrl}" style="color:#0F9A9A">${params.loginUrl}</a></p>`,
  );
  return sendEmail({ to: params.to, subject, html, text });
}

export async function sendEmailChangeVerification(params: {
  to: string;
  fullName: string;
  token: string;
}) {
  const origin = getAppOrigin();
  const link = `${origin}/verify-email?token=${encodeURIComponent(params.token)}`;
  const subject = `تأكيد البريد الجديد — ${clinicName()}`;
  const text = `مرحباً ${params.fullName}\n\nلتأكيد بريدك الجديد افتح:\n${link}\n`;
  const html = emailShell(
    "تأكيد البريد الجديد",
    `<p>مرحباً <strong>${params.fullName}</strong>،</p>
     <p>لتأكيد تغيير بريد الدخول، اضغط الزر خلال 24 ساعة:</p>
     <p style="margin:24px 0"><a href="${link}" style="display:inline-block;background:#0F9A9A;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:bold">تأكيد البريد</a></p>`,
  );
  return sendEmail({ to: params.to, subject, html, text });
}
