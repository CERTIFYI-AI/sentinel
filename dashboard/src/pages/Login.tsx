// src/pages/Login.tsx
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/auth/AuthLayout";
import { LoginForm } from "../components/auth/LoginForm";

export default function Login() {
  const navigate = useNavigate();
  return <AuthLayout><LoginForm onSuccess={() => navigate("/overview")} /></AuthLayout>;
}
