import React from 'react';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { getInitials } from '@/lib/utils'; // Importar getInitials

interface ProfileDropdownProps {
  userName: string;
  userRole: string;
  userEmail: string;
  userAvatar: string | null; // Puede ser null
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ userName, userRole, userEmail, userAvatar }) => {
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Error al cerrar sesión: ' + error.message);
    } else {
      showSuccess('Sesión cerrada correctamente.');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-3 cursor-pointer p-1 pr-2 rounded-full hover:bg-[#f2f8f7] dark:hover:bg-white/5 transition-colors border border-transparent hover:border-[#e7f3f2]">
          {userAvatar ? (
            <div
              className="size-9 rounded-full bg-cover bg-center border border-[#e7f3f2]"
              style={{ backgroundImage: `url('${userAvatar}')` }}
              aria-label="Retrato profesional de una doctora sonriendo"
            ></div>
          ) : (
            <div className="size-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
              {getInitials(userName)}
            </div>
          )}
          <div className="hidden xl:flex flex-col items-start mr-1">
            <span className="text-sm font-bold text-text-main dark:text-white leading-none">{userName}</span>
            <span className="text-[10px] text-text-secondary font-medium mt-1">{userRole}</span>
          </div>
          <span className="material-symbols-outlined text-text-secondary text-[18px] hidden xl:block">expand_more</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-surface-light dark:bg-surface-dark text-text-main dark:text-white border-border-color dark:border-slate-700">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border-color dark:bg-slate-700" />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="flex items-center gap-2 cursor-pointer hover:bg-primary/10 dark:hover:bg-white/5">
            <span className="material-symbols-outlined text-[18px]">person</span>
            <span>Mi Perfil</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex items-center gap-2 cursor-pointer hover:bg-primary/10 dark:hover:bg-white/5">
            <span className="material-symbols-outlined text-[18px]">settings</span>
            <span>Configuración</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border-color dark:bg-slate-700" />
        <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20">
          <span className="material-symbols-outlined text-[18px]">logout</span>
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;