import { Routes, Route, Navigate } from "react-router-dom"
import Login from "../pages/Login"
import Dashboard from "../pages/Dashboard"
import ProtectedRoute from "./ProtectedRoute"
import Seguradoras from "../pages/Seguradoras"
import Corretores from "../pages/Corretores"
import Clientes from "../pages/Clientes"

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/seguradoras" element={<Seguradoras />} />
        <Route path="/corretores" element={<Corretores />} />
        <Route path="/clientes" element={<Clientes />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}