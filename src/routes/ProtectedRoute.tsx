import { Navigate, Outlet } from "react-router-dom"
import { getAuth } from "../services/tokenStorage"

export default function ProtectedRoute() {
  const auth = getAuth()

  if (!auth?.accessToken) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}