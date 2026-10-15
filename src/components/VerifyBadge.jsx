const styles = {
  pending: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-green-100 text-du-green-dark',
  rejected: 'bg-red-100 text-du-red',
}
const labels = {
  pending: 'Waiting for admin',
  verified: 'Verified',
  rejected: 'Rejected',
}

export default function VerifyBadge({ status }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {labels[status] ?? status}
    </span>
  )
}