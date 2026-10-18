import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'
import RequireAdmin from './components/RequireAdmin'
import Login from './pages/Login'
import Register from './pages/Register'
import Verify from './pages/Verify'
import VerifyCertificate from './pages/VerifyCertificate'
import StudentHome from './pages/student/StudentHome'
import Dashboard from './pages/admin/Dashboard'
import Registrations from './pages/admin/Registrations'
import Profiles from './pages/admin/Profiles'
import Students from './pages/admin/Students'
import Rooms from './pages/admin/Rooms'
import Events from './pages/admin/Events'
import StatusRequests from './pages/admin/StatusRequests'
import Verification from './pages/admin/Verification'
import Certificates from './pages/admin/Certificates'
import CertificateView from './pages/admin/CertificateView'
import RegistrationWindows from './pages/admin/RegistrationWindows'
import Support from './pages/admin/Support'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify/:token" element={<Verify />} />
        <Route path="/verify-certificate/:token" element={<VerifyCertificate />} />
        <Route path="/student" element={<StudentHome />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="registrations" element={<Registrations />} />
          <Route path="profiles" element={<Profiles />} />
          <Route path="students" element={<Students />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="events" element={<Events />} />
          <Route path="status" element={<StatusRequests />} />
          <Route path="verification" element={<Verification />} />
          <Route path="certificates" element={<Certificates />} />
          <Route path="certificates/:id" element={<CertificateView />} />
          <Route path="windows" element={<RegistrationWindows />} />
          <Route path="support" element={<Support />} />
        </Route>
      </Route>
    </Routes>
  )
}