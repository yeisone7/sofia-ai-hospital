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
        // Si no está logueado y no está en login/register/landing, redirigir a landing
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/landing') {
          navigate("/landing");
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

  // Este componente no debería renderizarse si la redirección funciona,
  // pero como fallback o para usuarios no autenticados en la ruta raíz.
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