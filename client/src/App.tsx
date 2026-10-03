import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "./store";
import Layout from "./components/Layout";
import AuthPage from "./pages/AuthPage";
import PortfoliosPage from "./pages/PortfoliosPage";

function RequireAuth() {
  const token = useSelector((s: RootState) => s.auth.token);
  return token ? <Outlet /> : <Navigate to="/masuk" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/masuk" element={<AuthPage mode="masuk" />} />
      <Route path="/daftar" element={<AuthPage mode="daftar" />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<PortfoliosPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}