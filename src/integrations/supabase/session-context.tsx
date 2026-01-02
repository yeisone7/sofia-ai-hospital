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
          // Redirigir a la página principal si el usuario está autenticado y viene de una página de auth/landing
          if (currentSession && (window.location.pathname === '/login' || window.location.pathname === '/register' || window.location.pathname === '/landing')) {
            navigate('/dashboard');
          }
        } else if (event === 'SIGNED_OUT') {
          // Redirigir a la página de landing si el usuario no está autenticado
          if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/landing') {
            navigate('/landing');
          }
        } else if (event === 'INITIAL_SESSION') {
          // Manejar la sesión inicial
          if (!currentSession && window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/landing') {
            navigate('/landing'); // Redirigir a landing si no hay sesión y no está en una página de auth/landing
          } else if (currentSession && (window.location.pathname === '/login' || window.location.pathname === '/register' || window.location.pathname === '/landing')) {
            navigate('/dashboard'); // Redirigir a dashboard si hay sesión y está en una página de auth/landing
          }
        }
      }
    );

    // Obtener la sesión inicial al cargar el componente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      setIsLoading(false);
      if (!session && window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/landing') {
        navigate('/landing'); // Redirigir a landing si no hay sesión y no está en una página de auth/landing
      } else if (session && (window.location.pathname === '/login' || window.location.pathname === '/register' || window.location.pathname === '/landing')) {
        navigate('/dashboard'); // Redirigir a dashboard si hay sesión y está en una página de auth/landing
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