// Used by the student and admin screens.
// titles = the student's current titles [{ id }], subs = the answers for ONE request.
export function studentProgress(titles, subs) {
  if (titles.length === 0) {
    // Without titles there is one general answer to give
    const has = subs.length > 0
    return { needed: 1, done: has ? 1 : 0, complete: has, partial: false }
  }
  // An answer given before this change (no title) counts as complete for that old request
  const legacy = subs.some((s) => !s.title_id)
  const answered = new Set(subs.filter((s) => s.title_id).map((s) => s.title_id))
  const done = legacy ? titles.length : titles.filter((t) => answered.has(t.id)).length
  return { needed: titles.length, done, complete: done >= titles.length, partial: done > 0 && done < titles.length }
}