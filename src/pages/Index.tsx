import { MadeWithDyad } from "@/components/made-with-elmony";
import { useSession } from "@/integrations/supabase/session-context";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { user, isLoading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/dashboard");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-gray-600">Cargando...</p>
      </div>
    );
  }

  // Este contenido se mostrará brevemente si el usuario no está autenticado
  // antes de que SessionContextProvider lo redirija a /landing.
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Redirigiendo...</h1>
        <p className="text-xl text-gray-600">
          Por favor espera.
        </p>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;