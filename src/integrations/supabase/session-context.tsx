import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './client';
import { useNavigate } from 'react-router-dom';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setIsLoading(false);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Redirigir a la página principal si el usuario está autenticado
          if (currentSession && window.location.pathname === '/login') {
            navigate('/');
          }
        } else if (event === 'SIGNED_OUT') {
          // Redirigir a la página de login si el usuario no está autenticado
          if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            navigate('/login');
          }
        } else if (event === 'INITIAL_SESSION') {
          // Manejar la sesión inicial
          if (!currentSession && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            navigate('/login');
          } else if (currentSession && (window.location.pathname === '/login' || window.location.pathname === '/register')) {
            navigate('/');
          }
        }
      }
    );

    // Obtener la sesión inicial al cargar el componente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      setIsLoading(false);
      if (!session && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        navigate('/login');
      } else if (session && (window.location.pathname === '/login' || window.location.pathname === '/register')) {
        navigate('/');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <SessionContext.Provider value={{ session, user, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};