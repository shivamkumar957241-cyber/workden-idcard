try { require('dotenv').config(); } catch {}
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { db, logAudit } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'workden_super_secret_jwt_key_2026_do_not_share';

/**
 * Escape XML special chars for safe SVG text rendering
 */
function escXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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
 * Render an authentic CR80 WorkDen ID Card PNG (with realistic blur + centered Lock overlay when locked)
 * Matches the exact UI preview shown in the Member/Staff portal.
 */
async function generateCardPreviewPng({
  fullName,
  entityCode,
  profileType = 'USER',
  designation = '',
  department = '',
  currentPlan = '',
  mobile = '',
  expiryDate = '',
  qrToken = '',
  isUnlocked = false,
  feeRupees = 99
}) {
  const sharp = require('sharp');
  const isStaff = profileType === 'STAFF';
  const categoryText = isStaff ? (designation || 'Staff Member') : 'WorkDen Member';
  const detailLabel = isStaff ? 'DEPT' : 'PLAN';
  const detailValue = isStaff ? (department || 'Operations') : (currentPlan || 'WorkDen Access');
  const initials = (fullName || 'WD').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'WD';
  const validityText = expiryDate ? String(expiryDate).split('T')[0] : 'Valid 1 Year';

  // Generate QR SVG cells for realistic QR code box
  let qrSvgInner = '';
  try {
    const qrData = await QRCode.toString(`https://id.workden.online/verify/${qrToken || entityCode || 'workden'}`, {
      type: 'svg',
      margin: 1,
      width: 112,
      color: { dark: '#0B0B0B', light: '#FFFFFF' }
    });
    qrSvgInner = qrData.replace(/<\?xml[^>]*\?>/g, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');
  } catch {
    qrSvgInner = '<rect x="10" y="10" width="92" height="92" fill="#0B0B0B"/>';
  }

  const W = 680;
  const H = 428;

  const lockOverlay = !isUnlocked ? `
    <!-- Frosted dark tint -->
    <rect x="0" y="0" width="${W}" height="${H}" rx="28" fill="#0B0B0B" fill-opacity="0.48"/>

    <!-- Centered Golden Lock Circle -->
    <circle cx="${W / 2}" cy="176" r="40" fill="#231D0E" fill-opacity="0.92" stroke="#F5C542" stroke-width="2.5"/>
    <!-- Padlock Shackle & Body -->
    <g transform="translate(${W / 2 - 18}, 156)" fill="none" stroke="#F5C542" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="5" y="16" width="26" height="20" rx="4"/>
      <path d="M10 16V11a8 8 0 0 1 16 0v5"/>
    </g>

    <!-- Bold Overlay Text -->
    <text x="${W / 2}" y="252" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="900" fill="#FFFFFF">
      ID Card Approved &amp; Ready
    </text>
    <text x="${W / 2}" y="284" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="600" fill="#D4D4D4">
      Pay &#8377;${escXml(feeRupees)} via Razorpay to unlock &amp; download
    </text>
  ` : '';

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0B0B"/>
      <stop offset="50%" stop-color="#171717"/>
      <stop offset="100%" stop-color="#1E190E"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F5C542"/>
      <stop offset="100%" stop-color="#FFD84D"/>
    </linearGradient>
    <filter id="cardBlur" x="-5%" y="-5%" width="110%" height="110%">
      <feGaussianBlur stdDeviation="${isUnlocked ? '0' : '4.5'}"/>
    </filter>
    <clipPath id="cardClip">
      <rect x="0" y="0" width="${W}" height="${H}" rx="28"/>
    </clipPath>
  </defs>

  <g clip-path="url(#cardClip)">
    <!-- Background -->
    <rect x="0" y="0" width="${W}" height="${H}" rx="28" fill="url(#bgGrad)"/>

    <!-- Card Content Layer (Blurred when locked) -->
    <g filter="url(#cardBlur)">
      <!-- Top Header Bar -->
      <rect x="0" y="0" width="${W}" height="76" fill="#0B0B0B"/>
      <line x1="0" y1="76" x2="${W}" y2="76" stroke="#F5C542" stroke-opacity="0.25" stroke-width="1.5"/>

      <!-- Logo Box + Brand -->
      <rect x="24" y="16" width="44" height="44" rx="10" fill="#171717" stroke="#F5C542" stroke-width="1.8"/>
      <text x="46" y="45" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="900" fill="#F5C542">WD</text>
      <text x="82" y="37" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="900" fill="#F5C542">WorkDen</text>
      <text x="82" y="57" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" fill="#888888" letter-spacing="1.5">OFFICIAL IDENTITY CARD</text>

      <!-- Active Status Badge -->
      <rect x="546" y="22" width="106" height="32" rx="16" fill="#064E3B" stroke="#10B981" stroke-width="1.5"/>
      <circle cx="566" cy="38" r="4.5" fill="#10B981"/>
      <text x="606" y="43" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="800" fill="#34D399">ACTIVE</text>

      <!-- Left Photo / Initials Frame -->
      <rect x="26" y="104" width="128" height="162" rx="14" fill="#111111" stroke="#F5C542" stroke-width="2.5"/>
      <text x="90" y="198" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="900" fill="#F5C542">${escXml(initials)}</text>

      <!-- Middle Identity Details -->
      <text x="178" y="132" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="900" fill="#FFFFFF">${escXml(fullName || '—')}</text>
      <text x="178" y="160" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#F5C542">${escXml(categoryText)}</text>

      <text x="178" y="196" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#888888">ID NO</text>
      <text x="256" y="196" font-family="Courier New, monospace" font-size="15" font-weight="700" fill="#FFFFFF">${escXml(entityCode || '—')}</text>

      <text x="178" y="228" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#888888">${escXml(detailLabel)}</text>
      <rect x="256" y="210" width="210" height="26" rx="6" fill="url(#goldGrad)"/>
      <text x="266" y="228" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="800" fill="#0B0B0B">${escXml(detailValue)}</text>

      <text x="178" y="262" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#888888">MOBILE</text>
      <text x="256" y="262" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#FFFFFF">${escXml(mobile || '—')}</text>

      <text x="178" y="292" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#888888">VALID</text>
      <text x="256" y="292" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="600" fill="#E5E5E5">${escXml(validityText)}</text>

      <!-- Right QR Code Frame -->
      <rect x="514" y="114" width="136" height="162" rx="14" fill="#FFFFFF" stroke="#F5C542" stroke-width="2.5"/>
      <g transform="translate(526, 124)">
        ${qrSvgInner}
      </g>
      <text x="582" y="262" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="900" fill="#0B0B0B">SCAN TO VERIFY</text>

      <!-- Bottom Footer Strip inside Card -->
      <line x1="0" y1="364" x2="${W}" y2="364" stroke="#F5C542" stroke-opacity="0.22" stroke-width="1.5"/>
      <rect x="0" y="364" width="${W}" height="64" fill="#0B0B0B"/>
      <text x="26" y="401" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="600" fill="#999999">Official Security Verified Credential</text>
      <text x="654" y="401" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="800" fill="#F5C542">workden.online</text>
    </g>

    ${lockOverlay}

    <!-- Crisp Outer Gold Border -->
    <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="27" fill="none" stroke="#F5C542" stroke-opacity="0.55" stroke-width="2"/>
  </g>
</svg>
  `.trim();

  return await sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Build clean executive HTML email embedding the blurred locked CR80 card preview PNG
 */
function buildIdCardGeneratedHtml({
  fullName,
  profileType,
  isUnlocked,
  downloadUrl,
  previewImgUrl
}) {
  const isStaff = profileType === 'STAFF';
  const roleLabel = isStaff ? 'Staff ID Card' : 'Member ID Card';

  const actionText = isUnlocked
    ? `Your official WorkDen ${roleLabel} is active and ready. Click below to download your high-resolution ID card.`
    : `Your official WorkDen ${roleLabel} has been approved and generated. Click below to unlock and download your ID card.`;

  const ctaLabel = isUnlocked
    ? 'Download ID Card &rarr;'
    : 'Unlock &amp; Download ID Card &rarr;';

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

              <!-- Blurred Locked Real ID Card Preview Image -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 auto 24px auto;">
                <tr>
                  <td align="center">
                    <a href="${downloadUrl}" target="_blank" style="display:block;text-decoration:none;">
                      <img src="${previewImgUrl}" alt="WorkDen ID Card Preview" width="440" style="width:100%;max-width:440px;height:auto;border-radius:18px;display:block;margin:0 auto;border:1px solid #353535;" />
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Clean Primary CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${downloadUrl}" target="_blank" style="display:inline-block;padding:14px 34px;background-color:#F5C542;color:#0B0B0B;font-size:14px;font-weight:900;text-decoration:none;border-radius:12px;">
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
  isUnlocked = false
}) {
  try {
    if (!toEmail) return { success: false, error: 'Recipient email missing' };

    const { apiKey, senderEmail, senderName, portalUrl } = getEmailConfig();
    if (!apiKey || apiKey === 'your_brevo_api_key_here') {
      console.warn('⚠️ Brevo API key not configured; skipping ID Card email to', toEmail);
      return { success: false, error: 'Brevo API key not configured' };
    }

    const isStaff = profileType === 'STAFF';
    const accessToken = generateCardAccessToken(entityCode, profileType);
    const downloadUrl = `${portalUrl}/card-access/${accessToken}`;
    const previewImgUrl = `${portalUrl}/api/public-card/${accessToken}/preview.png`;

    const htmlContent = buildIdCardGeneratedHtml({
      fullName,
      profileType,
      isUnlocked,
      downloadUrl,
      previewImgUrl
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
  generateCardAccessToken,
  generateCardPreviewPng
};
