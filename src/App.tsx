import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { WorkerDashboard } from '@/pages/WorkerDashboard'
import { WorkerProfilePage } from '@/pages/WorkerProfile'
import { WorkerBrowseJobs } from '@/pages/WorkerBrowseJobs'
import { JobDetailsPage } from '@/pages/JobDetails'
import { WorkerApplicationsPage } from '@/pages/WorkerApplications'
import { EmployerDashboard } from '@/pages/EmployerDashboard'
import { EmployerProfilePage } from '@/pages/EmployerProfile'
import { PostJobPage } from '@/pages/PostJob'
import { EmployerApplicantsPage } from '@/pages/EmployerApplicants'
import { AdminDashboard } from '@/pages/AdminDashboard'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/worker"
            element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <WorkerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/profile"
            element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <WorkerProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/jobs"
            element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <WorkerBrowseJobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/jobs/:id"
            element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <JobDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/applications"
            element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <WorkerApplicationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer"
            element={
              <ProtectedRoute allowedRoles={['EMPLOYER']}>
                <EmployerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/profile"
            element={
              <ProtectedRoute allowedRoles={['EMPLOYER']}>
                <EmployerProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/jobs/new"
            element={
              <ProtectedRoute allowedRoles={['EMPLOYER']}>
                <PostJobPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/jobs/:id/applicants"
            element={
              <ProtectedRoute allowedRoles={['EMPLOYER']}>
                <EmployerApplicantsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
