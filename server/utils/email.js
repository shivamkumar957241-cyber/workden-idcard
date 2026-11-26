try { require('dotenv').config(); } catch {}
const jwt = require('jsonwebtoken');
const { db, logAudit } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'workden_super_secret_jwt_key_2026_do_not_share';

/**
 * Generate a long-lived cryptographic access token for direct card preview/payment/download
 */
function generateCardAccessToken(entityCode, profileType) {
  return jwt.sign(
    { purpose: 'CARD_ACCESS', entity_code: entityCode, profile_type: profileType },
    JWT_SECRET,
    { expiresIn: '180d' }
  );
}

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
  const rawName = settings.company_name || process.env.BREVO_SENDER_NAME || 'WorkDen';
  const senderName = rawName.toUpperCase() === 'WORKDEN' ? 'WorkDen' : rawName;
  const portalUrl = (process.env.PORTAL_URL || 'https://id.workden.online').replace(/\/+$/, '');

  return { apiKey, senderEmail, senderName, portalUrl, settings };
}

/**
 * Build a clean, executive HTML email featuring an authentic WorkDen CR80 ID Card preview
 */
function buildIdCardGeneratedHtml({
  fullName,
  entityCode,
  profileType,
  designation,
  department,
  currentPlan,
  mobile,
  photoUrl,
  expiryDate,
  isUnlocked,
  feeRupees,
  downloadUrl,
  portalUrl
}) {
  const isStaff = profileType === 'STAFF';
  const roleLabel = isStaff ? 'Staff ID Card' : 'Member ID Card';
  const categoryText = isStaff ? (designation || 'Staff Member') : 'WorkDen Member';
  const detailLabel = isStaff ? 'DEPT' : 'PLAN';
  const detailValue = isStaff ? (department || 'Operations') : (currentPlan || 'WorkDen Access');
  const initials = (fullName || 'WD').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'WD';

  // Prevent Gmail / Apple Mail from turning phone numbers or IDs into blue links
  const safeMobile = mobile ? String(mobile).replace(/(\d)/g, '$1&#8203;') : '';
  const safeEntityCode = entityCode ? String(entityCode).replace(/-/g, '&#8209;') : '—';
  const validityText = expiryDate ? String(expiryDate).split('T')[0].replace(/-/g, '&#8209;') : 'Valid 1 Year';

  const resolvedPhoto = photoUrl && photoUrl.startsWith('http')
    ? photoUrl
    : (photoUrl && photoUrl.startsWith('/uploads') ? `${portalUrl}${photoUrl}` : '');

  const photoHtml = resolvedPhoto
    ? `<img src="${resolvedPhoto}" alt="${initials}" width="64" height="80" style="width:64px;height:80px;object-fit:cover;border-radius:10px;border:1.5px solid #F5C542;display:block;" />`
    : `<div style="width:64px;height:80px;border-radius:10px;background-color:#111111;border:1.5px solid #F5C542;text-align:center;line-height:80px;font-size:20px;font-weight:900;color:#F5C542;">${initials}</div>`;

  const statusPill = isUnlocked
    ? `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#064e3b;color:#34d399;border:1px solid #10b981;font-size:10px;font-weight:800;letter-spacing:0.4px;">ACTIVE</span>`
    : `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#292008;color:#F5C542;border:1px solid #F5C542;font-size:10px;font-weight:800;letter-spacing:0.4px;">LOCKED</span>`;

  const actionText = isUnlocked
    ? `Your official WorkDen ${roleLabel} is active and ready. Click below to download your high-resolution ID card.`
    : `Your official WorkDen ${roleLabel} has been approved and generated. Click below to unlock and download your ID card.`;

  const ctaLabel = isUnlocked
    ? 'Download ID Card &rarr;'
    : 'Unlock &amp; Download ID Card &rarr;';

  // Clean masked QR grid visual for locked preview (no cartoonish emoji)
  const qrLockVisual = isUnlocked
    ? `<div style="width:64px;padding:10px 4px;border-radius:10px;background-color:#FFFFFF;border:1.5px solid #F5C542;text-align:center;">
         <div style="font-size:10px;font-weight:900;color:#0B0B0B;letter-spacing:0.5px;">QR</div>
         <div style="font-size:8px;font-weight:800;color:#059669;margin-top:3px;">VERIFIED</div>
       </div>`
    : `<div style="width:66px;padding:8px 4px;border-radius:10px;background-color:#1A160B;border:1.5px solid #F5C542;text-align:center;">
         <table role="presentation" align="center" cellspacing="2" cellpadding="0" style="margin:0 auto 4px auto;opacity:0.45;">
           <tr>
             <td style="width:7px;height:7px;background:#F5C542;border-radius:1px;"></td>
             <td style="width:7px;height:7px;background:#333333;border-radius:1px;"></td>
             <td style="width:7px;height:7px;background:#F5C542;border-radius:1px;"></td>
           </tr>
           <tr>
             <td style="width:7px;height:7px;background:#333333;border-radius:1px;"></td>
             <td style="width:7px;height:7px;background:#F5C542;border-radius:1px;"></td>
             <td style="width:7px;height:7px;background:#333333;border-radius:1px;"></td>
           </tr>
           <tr>
             <td style="width:7px;height:7px;background:#F5C542;border-radius:1px;"></td>
             <td style="width:7px;height:7px;background:#333333;border-radius:1px;"></td>
             <td style="width:7px;height:7px;background:#F5C542;border-radius:1px;"></td>
           </tr>
         </table>
         <div style="font-size:8px;font-weight:800;color:#F5C542;letter-spacing:0.6px;">LOCKED</div>
       </div>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Official WorkDen ID Card</title>
</head>
<body style="margin:0;padding:0;background-color:#0B0B0B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#FFFFFF;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0B0B0B;padding:28px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:540px;background-color:#171717;border:1px solid #2e2e2e;border-radius:20px;overflow:hidden;">
          <!-- Gold Top Accent -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#F5C542,#FFD84D,#F5C542);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:22px 26px 16px 26px;text-align:center;border-bottom:1px solid #262626;">
              <div style="font-size:22px;font-weight:900;letter-spacing:0.5px;color:#FFFFFF;">
                Work<span style="color:#F5C542;">Den</span>
              </div>
              <div style="font-size:11px;color:#888888;margin-top:3px;letter-spacing:1px;">
                Official Identity Portal
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:26px;">
              <h1 style="margin:0 0 8px 0;font-size:19px;font-weight:800;color:#FFFFFF;">
                Hello ${fullName || 'User'},
              </h1>
              <p style="margin:0 0 22px 0;font-size:13.5px;line-height:1.6;color:#BBBBBB;">
                ${actionText}
              </p>

              <!-- Authentic CR80 WorkDen ID Card Preview -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px;margin:0 auto 24px auto;background:linear-gradient(135deg,#0B0B0B 0%,#171717 50%,#1D190F 100%);border:1.5px solid #F5C542;border-radius:16px;overflow:hidden;">
                <!-- Card Top Header -->
                <tr>
                  <td style="padding:10px 16px;background-color:#0B0B0B;border-bottom:1px solid rgba(245,197,66,0.25);">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <span style="font-size:13px;font-weight:900;color:#FFFFFF;">Work<span style="color:#F5C542;">Den</span></span>
                          <span style="font-size:9px;color:#888888;margin-left:6px;letter-spacing:0.8px;">Official ID Card</span>
                        </td>
                        <td align="right">
                          ${statusPill}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Card Body -->
                <tr>
                  <td style="padding:16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="72" valign="top">
                          ${photoHtml}
                        </td>

                        <td valign="top" style="padding:0 10px;">
                          <div style="font-size:15px;font-weight:900;color:#FFFFFF;line-height:1.25;">
                            ${fullName || '—'}
                          </div>
                          <div style="font-size:11px;font-weight:700;color:#F5C542;margin-top:2px;margin-bottom:8px;">
                            ${categoryText}
                          </div>

                          <table role="presentation" cellspacing="0" cellpadding="0" style="font-size:11px;line-height:1.6;">
                            <tr>
                              <td style="color:#888888;font-weight:700;padding-right:8px;">ID NO</td>
                              <td style="color:#FFFFFF;font-family:monospace;font-weight:700;">${safeEntityCode}</td>
                            </tr>
                            <tr>
                              <td style="color:#888888;font-weight:700;padding-right:8px;">${detailLabel}</td>
                              <td style="color:#F5C542;font-weight:700;">${detailValue}</td>
                            </tr>
                            ${safeMobile ? `
                            <tr>
                              <td style="color:#888888;font-weight:700;padding-right:8px;">MOBILE</td>
                              <td style="color:#E5E5E5;font-weight:600;text-decoration:none;">${safeMobile}</td>
                            </tr>` : ''}
                            <tr>
                              <td style="color:#888888;font-weight:700;padding-right:8px;">VALID</td>
                              <td style="color:#CCCCCC;">${validityText}</td>
                            </tr>
                          </table>
                        </td>

                        <td width="70" align="right" valign="middle">
                          ${qrLockVisual}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${!isUnlocked ? `
                <tr>
                  <td style="padding:9px 14px;background-color:rgba(245,197,66,0.1);border-top:1px dashed rgba(245,197,66,0.35);text-align:center;font-size:11px;color:#F5C542;font-weight:700;">
                    Locked Preview &bull; Unlock to download PDF &amp; PNG
                  </td>
                </tr>` : ''}
              </table>

              <!-- Clean Primary CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${downloadUrl}" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#F5C542;color:#0B0B0B;font-size:14px;font-weight:900;text-decoration:none;border-radius:12px;">
                      ${ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 26px;background-color:#111111;border-top:1px solid #262626;text-align:center;">
              <p style="margin:0;font-size:11px;color:#777777;">
                &copy; ${new Date().getFullYear()} WorkDen &bull; <a href="https://workden.online" style="color:#999999;text-decoration:none;">workden.online</a> &bull; support@workden.online
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
 */
async function sendIdCardGeneratedEmail({
  toEmail,
  fullName,
  entityCode,
  profileType = 'USER',
  designation = '',
  department = '',
  currentPlan = '',
  mobile = '',
  photoUrl = '',
  expiryDate = '',
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
    const accessToken = generateCardAccessToken(entityCode, profileType);
    const downloadUrl = `${portalUrl}/card-access/${accessToken}`;

    const htmlContent = buildIdCardGeneratedHtml({
      fullName,
      entityCode,
      profileType,
      designation,
      department,
      currentPlan,
      mobile,
      photoUrl,
      expiryDate,
      isUnlocked,
      feeRupees,
      downloadUrl,
      portalUrl
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
  buildIdCardGeneratedHtml,
  generateCardAccessToken
};
