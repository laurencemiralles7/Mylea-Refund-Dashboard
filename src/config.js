export const SPREADSHEET_ID = '1gi5a0YMylYnTJ1vAbM-_YI3j00hL8bAhzfKtZP4sg_Q'

// Add more stores here as needed.
// sheetName must match the exact tab name in Google Sheets.
// Use gid as fallback if sheetName lookup fails.
export const STORES = [
  {
    id: 'frugaze',
    name: 'FRUGAZE',
    sheetName: 'FRUGAZE',
    currency: '$',
    color: '#6366F1',
  },
  // Example — uncomment and fill in when ready:
  // {
  //   id: 'mylea',
  //   name: 'Mylea',
  //   sheetName: 'Mylea',
  //   currency: '$',
  //   color: '#10B981',
  // },
]

export const REFRESH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
