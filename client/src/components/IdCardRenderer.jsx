import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { WORKDEN_LOGO_BASE64 } from '../assets/logoBase64';

const VERIFY_BASE = typeof import.meta !== 'undefined' && import.meta.env?.VITE_VERIFY_BASE_URL
  ? import.meta.env.VITE_VERIFY_BASE_URL
  : (typeof window !== 'undefined' ? window.location.origin : 'https://workden.online');

// CR80 card standard dimensions: 85.60 × 53.98 mm (Ratio ~1.586)
// Rendered at high fidelity: 340px × 214px
const CARD_W = 340;
const CARD_H = 214;

// Generate initials avatar as fallback in Matte Black & Gold
const getInitialsUri = (name) => {
  const initials = (name || 'WD').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="150" viewBox="0 0 120 150">
    <rect width="120" height="150" fill="#0B0B0B"/>
    <rect x="5" y="5" width="110" height="140" rx="8" fill="#171717" stroke="#F5C542" stroke-width="2"/>
    <text x="60" y="85" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="40" font-weight="bold" fill="#F5C542" text-anchor="middle">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Front Side
function IdCardFront({ card, settings, cardRef }) {
  const s = settings || {};
  const isStaff = (card.profile_type || 'USER') === 'STAFF';
  const verifyUrl = card.qr_token ? `${VERIFY_BASE}/verify/${card.qr_token}` : `${VERIFY_BASE}/verify/demo`;

  const photoSrc = card.photo_url
    ? (card.photo_url.startsWith('http') || card.photo_url.startsWith('data:') ? card.photo_url : card.photo_url)
    : getInitialsUri(card.full_name);

  // Matte Black & Golden Yellow Theme Palette
  const accentColor = '#F5C542'; // Golden Yellow
  const goldSecondary = '#FFD84D';

  const status = card.card_status || card.status || 'ACTIVE';
  const statusColor = {
    ACTIVE: '#10b981',
    PENDING: '#F5C542',
    EXPIRED: '#737373',
    SUSPENDED: '#f97316',
    REVOKED: '#ef4444'
  }[status] || '#10b981';

  // Format plan name cleanly (e.g. ₹499 Plan)
  const displayPlan = card.current_plan
    ? (card.current_plan.includes('₹') ? card.current_plan : (card.current_plan.match(/\d+/) ? `₹${card.current_plan}` : card.current_plan))
    : '₹499 Plan';

  const displayCategory = isStaff
    ? (card.designation || 'Staff Member')
    : (card.user_category && card.user_category !== 'Coworking Member' ? card.user_category : 'WorkDen Member');

  const expiryFormatted = card.expiry_date
    ? new Date(card.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Valid 1 Year';

  return (
    <div
      ref={cardRef}
      style={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 14,
        background: 'linear-gradient(135deg, #0B0B0B 0%, #171717 48%, #1A1710 100%)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 0 1px rgba(245,197,66,0.22), inset 0 1px 0 rgba(245,197,66,0.2)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        userSelect: 'none',
        boxSizing: 'border-box'
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          height: 40,
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(245,197,66,0.2)',
          background: '#0B0B0B',
          position: 'relative',
          zIndex: 2
        }}
      >
        {/* WorkDen Logo + Official Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div
            style={{
              width: 25,
              height: 25,
              borderRadius: 6,
              overflow: 'hidden',
              background: '#171717',
              border: `1.5px solid ${accentColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(245,197,66,0.25)',
              flexShrink: 0
            }}
          >
            <img
              src={WORKDEN_LOGO_BASE64}
              alt="WorkDen Logo"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => {
                e.currentTarget.src = WORKDEN_LOGO_BASE64;
              }}
            />
          </div>
          <div>
            <div style={{ color: accentColor, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', lineHeight: 1 }}>
              WORKDEN
            </div>
            <div style={{ color: '#D4D4D4', fontSize: 6.5, fontWeight: 700, letterSpacing: '0.12em', marginTop: 2 }}>
              OFFICIAL IDENTITY CARD
            </div>
          </div>
        </div>

        {/* Live Status Badge (ACTIVE remains green) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2.5px 7px',
            borderRadius: 99,
            background: `${statusColor}18`,
            border: `1px solid ${statusColor}40`
          }}
        >
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }} />
          <span style={{ color: statusColor, fontSize: 7, fontWeight: 800, letterSpacing: '0.06em' }}>
            {status}
          </span>
        </div>
      </div>

      {/* Main Body Area */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 0,
          right: 0,
          bottom: 22,
          padding: '8px 12px',
          display: 'flex',
          gap: 10,
          alignItems: 'center'
        }}
      >
        {/* Left Column: Profile Photo in Golden Frame */}
        <div style={{ width: 80, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              width: 80,
              height: 98,
              borderRadius: 8,
              border: `2px solid ${accentColor}`,
              overflow: 'hidden',
              background: '#171717',
              boxShadow: '0 4px 16px rgba(0,0,0,0.7), 0 0 10px rgba(245,197,66,0.22)',
              position: 'relative'
            }}
          >
            <img
              src={photoSrc}
              alt={card.full_name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => {
                e.target.src = getInitialsUri(card.full_name);
              }}
            />
          </div>
        </div>

        {/* Middle Column: User / Staff Information */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* Full Name */}
          <div
            style={{
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 800,
              lineHeight: 1.15,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '-0.01em',
              marginBottom: 2
            }}
            title={card.full_name}
          >
            {card.full_name || '—'}
          </div>

          {/* Subtitle / Category */}
          <div
            style={{
              color: accentColor,
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: '0.04em',
              marginBottom: 4,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {displayCategory}
          </div>

          {/* Key-Value Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 7.5, fontWeight: 700, width: 44, flexShrink: 0 }}>
                ID NO
              </span>
              <span style={{ color: '#ffffff', fontSize: 8.5, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                {card.entity_code || card.staff_id || card.user_id_code || '—'}
              </span>
            </div>

            {isStaff ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 7.5, fontWeight: 700, width: 44, flexShrink: 0 }}>
                  DEPT
                </span>
                <span style={{ color: '#ffffff', fontSize: 8, fontWeight: 600 }}>
                  {card.department || 'General'}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 7.5, fontWeight: 700, width: 44, flexShrink: 0 }}>
                  PLAN
                </span>
                <span
                  style={{
                    color: '#0B0B0B',
                    fontSize: 8,
                    fontWeight: 800,
                    background: `linear-gradient(135deg, ${accentColor} 0%, ${goldSecondary} 100%)`,
                    padding: '1.5px 6px',
                    borderRadius: 4,
                    boxShadow: '0 2px 6px rgba(245,197,66,0.3)',
                    letterSpacing: '0.02em'
                  }}
                >
                  {displayPlan}
                </span>
              </div>
            )}

            {/* Mobile Number - Displayed for both Staff & User */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 7.5, fontWeight: 700, width: 44, flexShrink: 0 }}>
                MOBILE
              </span>
              <span style={{ color: '#ffffff', fontSize: 8, fontWeight: 600 }}>
                {card.mobile || card.phone || '—'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 7.5, fontWeight: 700, width: 44, flexShrink: 0 }}>
                VALIDITY
              </span>
              <span style={{ color: '#E5E5E5', fontSize: 8, fontWeight: 500 }}>
                {expiryFormatted}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Properly Sized QR Code in Golden Frame */}
        <div style={{ width: 72, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              width: 72,
              background: '#ffffff',
              borderRadius: 8,
              padding: '4px',
              border: `1.5px solid ${accentColor}`,
              boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <QRCodeSVG value={verifyUrl} size={64} level="M" includeMargin={false} />
            <div
              style={{
                color: '#0B0B0B',
                fontSize: 5.5,
                fontWeight: 800,
                letterSpacing: '0.04em',
                marginTop: 2.5,
                textAlign: 'center',
                lineHeight: 1
              }}
            >
              SCAN TO VERIFY
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 22,
          padding: '0 12px',
          background: '#0B0B0B',
          borderTop: '1px solid rgba(245,197,66,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          zIndex: 2
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: accentColor }} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 7, fontWeight: 500, letterSpacing: '0.03em' }}>
            Official Security Verified Credential
          </span>
        </div>
        <span style={{ color: accentColor, fontSize: 7.5, fontWeight: 700, letterSpacing: '0.06em' }}>
          {s.company_website?.replace('https://', '').replace('http://', '') || 'workden.online'}
        </span>
      </div>
    </div>
  );
}

// Back Side
function IdCardBack({ card, settings, cardRef }) {
  const s = settings || {};
  const accentColor = '#F5C542';

  const defaultRules = [
    'This credential is official property of WorkDen.',
    'Must be presented upon request to security personnel.',
    'Non-transferable and must be surrendered upon cessation.',
    'Misuse, duplicate replication or tampering is strictly prohibited.'
  ];

  const rules = s.card_usage_rules
    ? s.card_usage_rules.split('\n').filter(Boolean).map(r => r.replace(/^\d+\.\s*/, ''))
    : defaultRules;

  const officeAddress = s.office_address || 'WorkDen Tower, Plot 14, Sector 62, Noida, UP 201301';
  const officialEmail = s.official_email || 'contact@workden.online';
  const signatoryTitle = s.authorized_signatory || 'Director of Operations';

  const issueDateFormatted = card.issue_date
    ? new Date(card.issue_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const expiryDateFormatted = card.expiry_date
    ? new Date(card.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div
      ref={cardRef}
      style={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 14,
        background: 'linear-gradient(135deg, #0B0B0B 0%, #171717 48%, #1A1710 100%)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 0 1px rgba(245,197,66,0.22), inset 0 1px 0 rgba(245,197,66,0.2)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        userSelect: 'none',
        boxSizing: 'border-box'
      }}
    >
      {/* Top Organization Header */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '6px 14px',
          borderBottom: '1px solid rgba(245,197,66,0.2)',
          background: '#0B0B0B',
          display: 'flex',
          alignItems: 'center',
          gap: 7
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            overflow: 'hidden',
            background: '#171717',
            border: `1px solid ${accentColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <img
            src={WORKDEN_LOGO_BASE64}
            alt="WorkDen Logo"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              e.currentTarget.src = WORKDEN_LOGO_BASE64;
            }}
          />
        </div>
        <div>
          <div style={{ color: accentColor, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.12em', lineHeight: 1 }}>
            {(s.company_name || 'WORKDEN').toUpperCase()}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 7, marginTop: 1, lineHeight: 1.25 }}>
            {officeAddress}
          </div>
        </div>
      </div>

      {/* Usage Instructions Area */}
      <div style={{ padding: '6px 14px 4px 14px' }}>
        <div style={{ color: accentColor, fontSize: 7, fontWeight: 800, letterSpacing: '0.08em', marginBottom: 3 }}>
          TERMS OF USE & GUIDELINES
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {rules.slice(0, 4).map((rule, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
              <span style={{ color: accentColor, fontSize: 7.5, lineHeight: 1, marginTop: 1 }}>•</span>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 7, lineHeight: 1.25 }}>
                {rule}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Area: Validity Badges + Authorized Signatory */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 2,
          padding: '6px 14px 6px 14px',
          borderTop: '1px solid rgba(245,197,66,0.2)',
          background: '#0B0B0B',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          boxSizing: 'border-box'
        }}
      >
        {/* Issue & Expiry Dates */}
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 2 }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 6, fontWeight: 700, letterSpacing: '0.08em' }}>
                ISSUED
              </div>
              <div style={{ color: '#ffffff', fontSize: 7.5, fontWeight: 700 }}>
                {issueDateFormatted}
              </div>
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 6, fontWeight: 700, letterSpacing: '0.08em' }}>
                EXPIRES
              </div>
              <div style={{ color: accentColor, fontSize: 7.5, fontWeight: 700 }}>
                {expiryDateFormatted}
              </div>
            </div>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 6.5 }}>
            Help: {officialEmail} {card.mobile || card.phone ? `• Tel: ${card.mobile || card.phone}` : ''}
          </div>
        </div>

        {/* Authorized Signatory */}
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ color: '#ffffff', fontSize: 7.5, fontWeight: 700, letterSpacing: '0.01em', marginBottom: 2 }}>
            {signatoryTitle}
          </div>
          <div
            style={{
              width: 80,
              borderBottom: '1px solid rgba(245,197,66,0.5)',
              marginBottom: 2
            }}
          />
          <div style={{ color: accentColor, fontSize: 5.5, letterSpacing: '0.03em', fontWeight: 600 }}>
            Authorized Signatory
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IdCardRenderer({ card, settings, side = 'front', cardRef }) {
  if (!card) return null;
  if (side === 'back') return <IdCardBack card={card} settings={settings} cardRef={cardRef} />;
  return <IdCardFront card={card} settings={settings} cardRef={cardRef} />;
}
