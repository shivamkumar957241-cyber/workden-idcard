/**
 * India Standard Time (IST - GMT+5:30) Date and Time Formatter
 */

export function formatIST(dateInput, includeTime = true) {
  if (!dateInput) return '—';
  
  let d;
  if (dateInput instanceof Date) {
    d = dateInput;
  } else {
    let s = String(dateInput).trim();
    // If it's a date-only YYYY-MM-DD string, parse components directly to avoid timezone shift
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [year, month, day] = s.split('-').map(Number);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${String(day).padStart(2, '0')} ${months[month - 1]} ${year}`;
    }
    // Handle SQLite UTC default timestamps (YYYY-MM-DD HH:mm:ss)
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/.test(s) && !s.includes('Z')) {
      s = s.replace(' ', 'T') + 'Z';
    }
    d = new Date(s);
  }

  if (isNaN(d.getTime())) return String(dateInput);

  if (includeTime) {
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }) + ' IST';
  }

  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function formatDateIST(dateInput) {
  return formatIST(dateInput, false);
}
