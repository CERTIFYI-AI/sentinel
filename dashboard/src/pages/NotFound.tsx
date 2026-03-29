import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { AlertTriangle, Home } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6"><AlertTriangle className="w-8 h-8 text-muted-foreground" /></div>
      <p className="text-sm text-muted-foreground font-mono mb-2">404</p>
      <h1 className="text-2xl font-bold mb-3">Page not found</h1>
      <p className="text-sm text-muted-foreground max-w-sm mb-8">The page you are looking for does not exist or has been moved.</p>
      <Button className="bg-green-600 hover:bg-green-700" onClick={() => navigate("/overview")}><Home className="w-4 h-4 mr-2" />Return to Dashboard</Button>
    </div>);
}
