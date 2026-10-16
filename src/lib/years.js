const YEAR_LABELS = {
  3: '2nd year',
  4: '3rd year',
  5: '4th year',
  6: '5th year',
}

export const yearOfStudyLabel = (year) =>
  YEAR_LABELS[year] ?? String(year ?? '')
