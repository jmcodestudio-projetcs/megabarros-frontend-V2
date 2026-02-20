import { Routes, Route, Navigate } from "react-router-dom"
import Login from "../pages/Login"
import Dashboard from "../pages/Dashboard"
import ProtectedRoute from "./ProtectedRoute"
import Seguradoras from "../pages/Seguradoras"
import Corretores from "../pages/Corretores"
import Clientes from "../pages/Clientes"
import Apolices from "../pages/Apolices"
import CorretorApolices from "../pages/CorretorApolices"

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/seguradoras" element={<Seguradoras />} />
        <Route path="/corretores" element={<Corretores />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/apolices" element={<Apolices />} />
        <Route path="/corretor/apolices" element={<CorretorApolices />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}