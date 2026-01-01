import { MadeWithDyad } from "@/components/made-with-elmony";
import { useSession } from "@/integrations/supabase/session-context";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { user, isLoading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        navigate("/dashboard");
      } else {
        // If not logged in and not on login/register, redirect to login
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          navigate("/login");
        }
      }
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-gray-600">Cargando...</p>
      </div>
    );
  }

  // This component should ideally not be rendered if redirection works,
  // but as a fallback or for unauthenticated users on the root path.
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Your Blank App</h1>
        <p className="text-xl text-gray-600">
          Start building your amazing project here!
        </p>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;