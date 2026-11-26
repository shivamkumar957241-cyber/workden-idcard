try { require('dotenv').config(); } catch {}
const { db, logAudit } = require('../db');

/**
 * Get Brevo & Portal settings from DB + .env
 */
function getEmailConfig() {
  let settings = {};
  try {
    settings = db.prepare('SELECT * FROM id_card_settings WHERE id = 1').get() || {};
  } catch {}

  const apiKey = settings.brevo_api_key || process.env.BREVO_API_KEY || '';
  const senderEmail = settings.brevo_sender_email || process.env.BREVO_SENDER_EMAIL || 'idcard@workden.online';
  const senderName = settings.company_name || process.env.BREVO_SENDER_NAME || 'WorkDen';
  const portalUrl = (process.env.PORTAL_URL || 'https://id.workden.online').replace(/\/+$/, '');

  return { apiKey, senderEmail, senderName, portalUrl, settings };
}

/**
 * Build a crisp, responsive HTML email featuring a Locked WorkDen ID Card preview
 */
function buildIdCardGeneratedHtml({
  fullName,
  entityCode,
  profileType,
  designation,
  department,
  currentPlan,
  isUnlocked,
  feeRupees,
  downloadUrl
}) {
  const isStaff = profileType === 'STAFF';
  const roleLabel = isStaff ? 'Staff ID Card' : 'Member ID Card';
  const subLabel = isStaff ? (designation || department || 'WorkDen Staff') : (currentPlan || 'WorkDen Member');

  const statusPill = isUnlocked
    ? `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:#064e3b;color:#34d399;border:1px solid #10b981;font-size:11px;font-weight:700;">UNLOCKED &amp; READY</span>`
    : `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:#292008;color:#F5C542;border:1px solid #F5C542;font-size:11px;font-weight:700;">APPROVED • LOCKED</span>`;

  const actionText = isUnlocked
    ? 'Your official WorkDen ID Card is unlocked and ready. Click the button below to download your high-resolution PDF / PNG.'
    : `Your official WorkDen ${roleLabel} has been generated and approved! Complete the ₹${feeRupees} verification step to unlock and download your high-resolution ID card.`;

  const ctaLabel = isUnlocked
    ? 'Download ID Card Now →'
    : `Unlock &amp; Download ID Card (₹${feeRupees}) →`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Official WorkDen ID Card</title>
</head>
<body style="margin:0;padding:0;background-color:#0B0B0B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#FFFFFF;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0B0B0B;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#171717;border:1px solid #2e2e2e;border-radius:20px;overflow:hidden;">
          <!-- Gold Top Accent -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#F5C542,#FFD84D,#F5C542);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:28px 28px 16px 28px;text-align:center;border-bottom:1px solid #262626;">
              <div style="font-size:22px;font-weight:900;letter-spacing:1px;color:#FFFFFF;">
                Work<span style="color:#F5C542;">Den</span>
              </div>
              <div style="font-size:11px;color:#888888;margin-top:4px;letter-spacing:1.5px;text-transform:uppercase;">
                Official Identity Portal
              </div>
            </td>
          </tr>

          <!-- Body Greeting -->
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 10px 0;font-size:20px;font-weight:800;color:#FFFFFF;">
                Hello ${fullName || 'User'},
              </h1>
              <p style="margin:0 0 22px 0;font-size:14px;line-height:1.6;color:#BBBBBB;">
                ${actionText}
              </p>

              <!-- Locked ID Card Preview Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#0B0B0B 0%,#1B1810 100%);border:1.5px solid #F5C542;border-radius:16px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:14px 18px;background-color:#0B0B0B;border-bottom:1px solid #2d2614;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size:13px;font-weight:900;color:#F5C542;letter-spacing:1px;">
                          WorkDen
                        </td>
                        <td align="right">
                          ${statusPill}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 18px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td valign="top">
                          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888888;font-weight:700;">
                            ${roleLabel}
                          </div>
                          <div style="font-size:18px;font-weight:800;color:#FFFFFF;margin-top:4px;">
                            ${fullName || '—'}
                          </div>
                          <div style="font-size:12px;color:#F5C542;font-weight:700;margin-top:2px;">
                            ${subLabel}
                          </div>
                          <div style="margin-top:12px;font-size:12px;color:#CCCCCC;font-family:monospace;">
                            ID NO: <strong style="color:#FFFFFF;">${entityCode || '—'}</strong>
                          </div>
                        </td>
                        <td width="76" align="right" valign="middle">
                          <div style="width:64px;height:64px;border-radius:12px;background-color:#221D0E;border:1px solid #F5C542;text-align:center;line-height:64px;font-size:26px;">
                            ${isUnlocked ? '✅' : '🔒'}
                          </div>
                        </td>
                      </tr>
                    </table>

                    ${!isUnlocked ? `
                    <div style="margin-top:16px;padding:10px 12px;background-color:rgba(245,197,66,0.1);border:1px dashed rgba(245,197,66,0.45);border-radius:10px;text-align:center;font-size:11px;color:#F5C542;font-weight:700;">
                      🔒 ID Card Preview Locked — Click below to unlock &amp; download
                    </div>` : ''}
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${downloadUrl}" target="_blank" style="display:inline-block;padding:14px 28px;background-color:#F5C542;color:#0B0B0B;font-size:14px;font-weight:900;text-decoration:none;border-radius:12px;">
                      ${ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:22px 0 0 0;font-size:12px;color:#777777;text-align:center;line-height:1.5;">
                If the button doesn't work, copy and open this link:<br/>
                <a href="${downloadUrl}" style="color:#F5C542;text-decoration:underline;word-break:break-all;">${downloadUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 28px;background-color:#111111;border-top:1px solid #262626;text-align:center;">
              <p style="margin:0;font-size:11px;color:#777777;">
                © ${new Date().getFullYear()} WorkDen • <a href="https://workden.online" style="color:#999999;text-decoration:none;">workden.online</a> • Support: support@workden.online
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Send "ID Card Generated" Email via Brevo Transactional Email API
 * Non-blocking safe wrapper: logs success/failure without throwing.
 */
async function sendIdCardGeneratedEmail({
  toEmail,
  fullName,
  entityCode,
  profileType = 'USER',
  designation = '',
  department = '',
  currentPlan = '',
  isUnlocked = false
}) {
  try {
    if (!toEmail) return { success: false, error: 'Recipient email missing' };

    const { apiKey, senderEmail, senderName, portalUrl, settings } = getEmailConfig();
    if (!apiKey || apiKey === 'your_brevo_api_key_here') {
      console.warn('⚠️ Brevo API key not configured; skipping ID Card email to', toEmail);
      return { success: false, error: 'Brevo API key not configured' };
    }

    const isStaff = profileType === 'STAFF';
    const feeRupees = isStaff ? (settings.staff_fee ?? 249) : (settings.member_fee ?? 99);
    const downloadUrl = isStaff
      ? `${portalUrl}/staff?tab=card`
      : `${portalUrl}/member?tab=download`;

    const htmlContent = buildIdCardGeneratedHtml({
      fullName,
      entityCode,
      profileType,
      designation,
      department,
      currentPlan,
      isUnlocked,
      feeRupees,
      downloadUrl
    });

    const payload = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: toEmail, name: fullName || toEmail }],
      subject: `Your Official WorkDen ${isStaff ? 'Staff' : 'Member'} ID Card is Ready (${entityCode})`,
      htmlContent
    };

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('❌ Brevo email error:', res.status, data);
      logAudit('EMAIL_SEND_FAILED', 'System', 'EMAIL', entityCode || toEmail, `Brevo error ${res.status}: ${JSON.stringify(data)}`);
      return { success: false, error: data.message || `HTTP ${res.status}` };
    }

    console.log(`📧 ID Card generated email sent via Brevo to ${toEmail} (messageId: ${data.messageId || 'ok'})`);
    logAudit('EMAIL_SENT', 'System', 'EMAIL', entityCode || toEmail, `Sent ID Card email to ${toEmail} via ${senderEmail}`);
    return { success: true, messageId: data.messageId };
  } catch (err) {
    console.error('❌ sendIdCardGeneratedEmail exception:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendIdCardGeneratedEmail,
  buildIdCardGeneratedHtml
};
