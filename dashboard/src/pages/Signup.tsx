import { SquaresFour, Plus, MagnifyingGlass } from '@phosphor-icons/react';
// src/pages/Signup.tsx
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/auth/AuthLayout";
import { SignupForm } from "../components/auth/SignupForm";

export default function Signup() {
  const navigate = useNavigate();
  return <AuthLayout><SignupForm onSuccess={() => navigate("/overview")} /></AuthLayout>;
}
