const YEAR_LABELS = {
  2: '2nd year',
  3: '3rd year',
  4: '4th year',
  5: '5th year',
}

export const yearOfStudyLabel = (year) =>
  YEAR_LABELS[year] ?? String(year ?? '')
