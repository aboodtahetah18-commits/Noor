import type { SVGProps } from 'react';

/**
 * Governed Lucide icon subset for UX-P10.
 * Geometry follows Lucide's 24x24 outline language; stroke width is fixed at 2.
 */
export type LucideIconName =
  | 'house' | 'receiptText' | 'walletCards' | 'landmark' | 'target' | 'sparkles'
  | 'bell' | 'chart' | 'settings' | 'ellipsis' | 'plus' | 'pencil' | 'trash2'
  | 'search' | 'slidersHorizontal' | 'x' | 'check' | 'refreshCw' | 'upload'
  | 'download' | 'eye' | 'eyeOff' | 'calendarDays' | 'copy' | 'circleCheck'
  | 'triangleAlert' | 'circleX' | 'info' | 'loaderCircle' | 'searchX' | 'wifiOff'
  | 'lockKeyhole' | 'arrowUpDown' | 'arrowUp' | 'arrowDown' | 'chevronDown'
  | 'chevronUp' | 'chevronLeft' | 'chevronRight' | 'store' | 'banknote'
  | 'badgeDollarSign' | 'listChecks' | 'circleUserRound' | 'creditCard' | 'save' | 'menu'
  | 'ban' | 'repeat2' | 'messageSquareText' | 'layoutGrid' | 'sun' | 'moon' | 'logOut' | 'printer';

const paths: Record<LucideIconName, React.ReactNode> = {
  house:<><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></>,
  receiptText:<><path d="M5 3v18l3-2 3 2 3-2 3 2 2-1.33V3l-2 1.33L14 3l-3 1.33L8 3 5 4.33Z"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
  walletCards:<><path d="M2 7a3 3 0 0 1 3-3h13v16H5a3 3 0 0 1-3-3Z"/><path d="M18 8h4v8h-4a4 4 0 0 1 0-8Z"/><path d="M6 8h7"/></>,
  landmark:<><path d="M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 19h18M12 3l9 4H3Z"/></>,
  target:<><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 12 20 4"/></>,
  sparkles:<><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5Z"/><path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z"/></>,
  bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  chart:<><path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 4-6"/></>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.83 2.83-.06-.06A1.65 1.65 0 0 0 15.08 19a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.04V21h-4v-.36A1.65 1.65 0 0 0 8.67 19a1.65 1.65 0 0 0-1.82.33l-.06.06-2.83-2.83.06-.06A1.65 1.65 0 0 0 4 14.67a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.04-.33H2v-4h.36A1.65 1.65 0 0 0 4 8.67a1.65 1.65 0 0 0-.33-1.82l-.06-.06L6.44 3.96l.06.06A1.65 1.65 0 0 0 8.33 4a1.65 1.65 0 0 0 1-.6A1.65 1.65 0 0 0 9.66 2.36V2h4v.36A1.65 1.65 0 0 0 15.33 4a1.65 1.65 0 0 0 1.82-.33l.06-.06 2.83 2.83-.06.06A1.65 1.65 0 0 0 20 8.33c.2.37.53.68.92.86.22.1.47.15.72.15H22v4h-.36A1.65 1.65 0 0 0 20 15.33Z"/></>,
  ellipsis:<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  plus:<path d="M12 5v14M5 12h14"/>, pencil:<><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
  trash2:<><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></>,
  search:<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
  slidersHorizontal:<><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></>,
  x:<path d="m6 6 12 12M18 6 6 18"/>, check:<path d="m5 12 4 4L19 6"/>,
  refreshCw:<><path d="M20 6v6h-6"/><path d="M4 18v-6h6"/><path d="M18.5 9A7 7 0 0 0 6 6.5L4 9M5.5 15A7 7 0 0 0 18 17.5l2-2.5"/></>,
  upload:<><path d="M12 16V4m0 0-4 4m4-4 4 4M5 20h14"/></>, download:<><path d="M12 4v12m0 0 4-4m-4 4-4-4M5 20h14"/></>,
  eye:<><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
  eyeOff:<><path d="m3 3 18 18"/><path d="M10.6 10.6A2 2 0 0 0 13.4 13.4"/><path d="M9.9 5.1A11 11 0 0 1 12 5c6 0 9.5 7 9.5 7a16 16 0 0 1-2.2 3.2M6.6 6.6C3.8 8.4 2.5 12 2.5 12s3.5 7 9.5 7a10.5 10.5 0 0 0 4-.8"/></>,
  calendarDays:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></>,
  copy:<><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></>,
  circleCheck:<><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
  triangleAlert:<><path d="M10.3 3.9 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>,
  circleX:<><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></>, info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
  loaderCircle:<><path d="M21 12a9 9 0 1 1-6.2-8.56"/></>, searchX:<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M8 8l6 6m0-6-6 6"/></>,
  wifiOff:<><path d="m2 2 20 20M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4.5-2.3M14.5 10.7A10 10 0 0 1 19 13M2 9a15 15 0 0 1 3.5-2.2M10 6a15 15 0 0 1 12 3M12 20h.01"/></>,
  lockKeyhole:<><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
  arrowUpDown:<><path d="m7 15-3 3 3 3M4 18V4M17 9l3-3-3-3M20 6v14"/></>, arrowUp:<path d="m5 12 7-7 7 7M12 5v14"/>, arrowDown:<path d="m19 12-7 7-7-7M12 19V5"/>,
  chevronDown:<path d="m6 9 6 6 6-6"/>, chevronUp:<path d="m18 15-6-6-6 6"/>, chevronLeft:<path d="m15 18-6-6 6-6"/>, chevronRight:<path d="m9 18 6-6-6-6"/>,
  store:<><path d="M4 10h16l-1.5-5h-13Z"/><path d="M6 10v9h12v-9M9 19v-5h6v5"/></>,
  banknote:<><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 9H4v2M18 15h2v-2"/></>,
  badgeDollarSign:<><path d="M12 2.5 14 4l2.5-.3.8 2.4 2.2 1.2-.9 2.3L20 12l-1.4 2.4.9 2.3-2.2 1.2-.8 2.4L14 20l-2 1.5L10 20l-2.5.3-.8-2.4-2.2-1.2.9-2.3L4 12l1.4-2.4-.9-2.3 2.2-1.2.8-2.4L10 4Z"/><path d="M14.5 9.5c-.4-1-1.3-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1.2 0-2.1-.5-2.5-1.5M12 6.5v11"/></>,
  listChecks:<><path d="m3 6 1 1 2-2M9 6h12M3 12l1 1 2-2M9 12h12M3 18l1 1 2-2M9 18h12"/></>,
  circleUserRound:<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M6.5 18a6.5 6.5 0 0 1 11 0"/></>,
  creditCard:<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h2"/></>,
  save:<><path d="M5 4h12l2 2v14H5Z"/><path d="M8 4v6h8V4M8 20v-6h8v6"/></>,
  menu:<><path d="M4 6h16M4 12h16M4 18h16"/></>,
  ban:<><circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/></>,
  repeat2:<><path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></>,
  messageSquareText:<><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 8h8M8 12h6"/></>,
  layoutGrid:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  sun:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
  moon:<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/>,
  logOut:<><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></>,
  printer:<><path d="M6 9V3h12v6"/><rect x="6" y="14" width="12" height="7" rx="1"/><path d="M6 17H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><path d="M18 12h.01"/></>,
};

export function LucideIcon({name,size=20,className,...props}:{name:LucideIconName;size?:16|20|24|32;className?:string} & Omit<SVGProps<SVGSVGElement>,'name'>){
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false" {...props}>{paths[name]}</svg>;
}
