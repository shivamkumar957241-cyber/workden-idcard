/**
 * Generate a Matte Black & Gold initials avatar data URI when no user photo is uploaded.
 * Never falls back to the WorkDen brand logo.
 */
export function getInitialsAvatarUri(name) {
  const initials = (name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || 'U';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="150" viewBox="0 0 120 150">
    <rect width="120" height="150" fill="#0B0B0B"/>
    <rect x="5" y="5" width="110" height="140" rx="8" fill="#171717" stroke="#F5C542" stroke-width="2"/>
    <text x="60" y="85" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="40" font-weight="bold" fill="#F5C542" text-anchor="middle">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
