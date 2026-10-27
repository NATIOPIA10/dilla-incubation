import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import PublicLayout from './components/PublicLayout'
import AdminLayout from './components/AdminLayout'
import RequireAdmin from './components/RequireAdmin'
import Home from './pages/public/Home'
import About from './pages/public/About'
import Contact from './pages/public/Contact'
import Login from './pages/Login'
import Register from './pages/Register'
import EditRegistration from './pages/EditRegistration'
import Verify from './pages/Verify'
import VerifyCertificate from './pages/VerifyCertificate'
import StudentHome from './pages/student/StudentHome'
import Dashboard from './pages/admin/Dashboard'
import Registrations from './pages/admin/Registrations'
import RegistrationWindows from './pages/admin/RegistrationWindows'
import RegistrationPoster from './pages/admin/RegistrationPoster'
import Profiles from './pages/admin/Profiles'
import Students from './pages/admin/Students'
import PhotoChanges from './pages/admin/PhotoChanges'
import Rooms from './pages/admin/Rooms'
import Events from './pages/admin/Events'
import Support from './pages/admin/Support'
import StatusRequests from './pages/admin/StatusRequests'
import Verification from './pages/admin/Verification'
import Certificates from './pages/admin/Certificates'
import CertificateView from './pages/admin/CertificateView'
import WebsiteContent from './pages/admin/WebsiteContent'

export default function App() {
  return (
    <Routes>
      {/* The public website */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      {/* The system */}
      <Route element={<Layout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/edit-registration/:token" element={<EditRegistration />} />
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
          <Route path="photos" element={<PhotoChanges />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="events" element={<Events />} />
          <Route path="support" element={<Support />} />
          <Route path="status" element={<StatusRequests />} />
          <Route path="verification" element={<Verification />} />
          <Route path="certificates" element={<Certificates />} />
          <Route path="certificates/:id" element={<CertificateView />} />
          <Route path="windows" element={<RegistrationWindows />} />
          <Route path="poster" element={<RegistrationPoster />} />
          <Route path="website" element={<WebsiteContent />} />
        </Route>
      </Route>
    </Routes>
  )
}