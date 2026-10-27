import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RequireAdmin({ children }) {
  const { session, isAdmin, loading } = useAuth()

  if (loading) return <p className="text-center p-10 text-gray-500">Loading...</p>
  if (!session) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/student" replace />
  return children
}