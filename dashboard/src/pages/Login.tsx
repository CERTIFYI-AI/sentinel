import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const handleLogin = (e) => { e.preventDefault(); localStorage.setItem("sentinel_auth","true"); navigate("/"); };
  return (<div className="min-h-screen flex items-center justify-center bg-background"><Card className="w-full max-w-md"><CardHeader className="text-center"><CardTitle className="text-2xl">Sentinel AI GRC</CardTitle><p className="text-muted-foreground">Sign in to your account</p></CardHeader><CardContent><form onSubmit={handleLogin} className="space-y-4"><Input type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} /><Input type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} /><Button type="submit" className="w-full">Sign In</Button></form></CardContent></Card></div>);
}
