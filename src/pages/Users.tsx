import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { getInitials } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'user';
  is_active: boolean;
  avatar_url: string | null;
  id_number?: string;
  created_at?: string;
  updated_at: string;
}

const Users = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const navigate = useNavigate();

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  const isAdmin = user?.user_metadata?.role === 'admin';

  useEffect(() => {
    if (!isSessionLoading && (!user || !isAdmin)) {
      showError('Acceso denegado. Necesitas ser administrador para ver esta página.');
      navigate('/dashboard');
    } else if (user && isAdmin) {
      fetchUsersData();
    }
  }, [user, isSessionLoading, isAdmin, navigate]);

  useEffect(() => {
    applyFiltersAndPagination();
  }, [allUsers, searchQuery, currentPage]);

  const fetchUsersData = async () => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          role,
          is_active,
          avatar_url,
          updated_at,
          email
        `)
        .order('last_name', { ascending: true });

      if (error) throw error;

      setAllUsers(data || []);

    } catch (error: any) {
      console.error('Error fetching users data:', error);
      showError('Error al cargar los usuarios: ' + error.message);
    } finally {
      setUsersLoading(false);
    }
  };

  const applyFiltersAndPagination = () => {
    let tempUsers = [...allUsers];

    if (searchQuery) {
      tempUsers = tempUsers.filter(userProfile =>
        userProfile.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        userProfile.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        userProfile.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    setFilteredUsers(tempUsers.slice(startIndex, endIndex));
  };

  const handleToggleActiveStatus = async (userProfile: UserProfile) => {
    if (userProfile.id === user?.id) {
      showError('No puedes cambiar tu propio estado activo.');
      return;
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !userProfile.is_active, updated_at: new Date().toISOString() })
        .eq('id', userProfile.id);

      if (error) throw error;

      showSuccess(`Estado de ${userProfile.first_name} actualizado a ${!userProfile.is_active ? 'Activo' : 'Inactivo'}.`);
      fetchUsersData();
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      showError('Error al cambiar el estado del usuario: ' + error.message);
    }
  };

  const handleChangeUserRole = async (userProfile: UserProfile, newRole: 'admin' | 'user') => {
    if (userProfile.id === user?.id && newRole !== 'admin') {
      showError('No puedes degradar tu propio rol de administrador.');
      return;
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userProfile.id);

      if (error) throw error;

      showSuccess(`Rol de ${userProfile.first_name} actualizado a ${newRole}.`);
      fetchUsersData();
    } catch (error: any) {
      console.error('Error changing user role:', error);
      showError('Error al cambiar el rol del usuario: ' + error.message);
    }
  };

  const totalPages = Math.ceil(allUsers.length / usersPerPage);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const renderLoadingState = () => (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 mt-4 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="h-10 w-full md:max-w-md bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      </div>
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-white/5">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                      <div className="flex flex-col gap-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                  <td className="px-6 py-4"><div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div></td>
                  <td className="px-6 py-4 text-right"><div className="h-8 w-12 ml-auto bg-gray-200 dark:bg-gray-700 rounded-lg"></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark relative">
      <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-10">
        {usersLoading ? (
          renderLoadingState()
        ) : (
          <div className="max-w-6xl mx-auto flex flex-col gap-8 mt-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold text-text-main dark:text-white tracking-tight">Gestión de Usuarios</h1>
              <p className="text-text-secondary">Administra los permisos y el acceso de los usuarios al sistema.</p>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative group w-full md:max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors">search</span>
                </div>
                <input
                  className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-white dark:bg-surface-dark text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/50 shadow-sm text-sm transition-all"
                  placeholder="Buscar por nombre o email..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-white/5">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Usuario</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rol</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-text-secondary">No se encontraron usuarios.</td>
                      </tr>
                    ) : (
                      filteredUsers.map((userProfile) => (
                        <tr key={userProfile.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              {userProfile.avatar_url ? (
                                <img src={userProfile.avatar_url} alt={userProfile.first_name} className="size-10 rounded-full object-cover" />
                              ) : (
                                <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                  {getInitials(userProfile.first_name + ' ' + userProfile.last_name)}
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{userProfile.first_name} {userProfile.last_name}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{userProfile.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Select
                              value={userProfile.role}
                              onValueChange={(newRole: 'admin' | 'user') => handleChangeUserRole(userProfile, newRole)}
                              disabled={userProfile.id === user?.id}
                            >
                              <SelectTrigger className="w-[140px] h-9 bg-background-light dark:bg-background-dark">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-surface-light dark:bg-surface-dark text-text-main dark:text-white border-border-color dark:border-slate-700">
                                <SelectItem value="user">Usuario</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${userProfile.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                              {userProfile.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2 pr-2">
                              <Switch
                                checked={userProfile.is_active}
                                onCheckedChange={() => handleToggleActiveStatus(userProfile)}
                                disabled={userProfile.id === user?.id}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Total: <span className="font-bold text-slate-900 dark:text-white">{allUsers.length}</span> usuarios
                </p>
                <div className="flex gap-2">
                  <button onClick={handlePreviousPage} disabled={currentPage === 1} className="px-3 py-1 text-sm bg-white dark:bg-white/10 border rounded-lg disabled:opacity-50">Anterior</button>
                  <button onClick={handleNextPage} disabled={currentPage === totalPages} className="px-3 py-1 text-sm bg-white dark:bg-white/10 border rounded-lg disabled:opacity-50">Siguiente</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Users;