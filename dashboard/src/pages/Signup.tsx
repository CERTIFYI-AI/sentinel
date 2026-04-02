import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 mx-auto text-[hsl(var(--brand))] mb-2" />
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <p className="text-muted-foreground">Sign up for Certifyi Sentinel</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button className="w-full" onClick={() => navigate("/overview")}>Sign Up</Button>
          <p className="text-center text-sm text-muted-foreground">Already have an account? <a href="/login" className="text-[hsl(var(--brand))]">Log in</a></p>
        </CardContent>
      </Card>
    </div>
  );
}
