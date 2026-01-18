import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import ProfileDropdown from '@/components/ProfileDropdown';
import { getInitials } from '@/lib/utils';
import { showError } from '@/utils/toast';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Check, BellOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface Notification {
    id: string;
    title: string;
    content: string;
    type: string;
    is_read: boolean;
    created_at: string;
}

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const { user, isLoading: isSessionLoading } = useSession();
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialSearch = queryParams.get('search') || '';

    const [clinicSettings, setClinicSettings] = useState({
        name: 'Clínica Dental',
        branch: 'Sucursal Centro'
    });
    const [patientSearchQuery, setPatientSearchQuery] = useState(initialSearch);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

    useEffect(() => {
        setPatientSearchQuery(initialSearch);
    }, [initialSearch]);

    const isAdmin = user?.user_metadata?.role === 'admin';

    useEffect(() => {
        if (!isSessionLoading && !user) {
            navigate('/login');
        } else if (user) {
            fetchHeaderData();
        }
    }, [user, isSessionLoading, navigate]);

    const fetchHeaderData = async () => {
        try {
            // Fetch clinic settings
            const { data: settings, error: settingsError } = await supabase
                .from('clinic_settings')
                .select('clinic_name, clinic_address')
                .eq('id', user?.id)
                .single();

            if (settings) {
                setClinicSettings({
                    name: settings.clinic_name || 'Clínica Dental',
                    branch: settings.clinic_address ? settings.clinic_address.split(',')[0] : 'Sucursal Centro'
                });
            }

            // Fetch unread messages
            const { count, error: _unreadError } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user?.id)
                .eq('sender', 'user')
                .eq('is_read', false);

            setUnreadMessages(count || 0);

            // Fetch notifications
            const { data: notificationsData } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (notificationsData) {
                setNotifications(notificationsData);
                setUnreadNotificationsCount(notificationsData.filter(n => !n.is_read).length);
            }
        } catch (error) {
            console.error('Error fetching header data:', error);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);

            if (error) throw error;

            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user?.id)
                .eq('is_read', false);

            if (error) throw error;

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadNotificationsCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (patientSearchQuery.trim()) {
            navigate(`/appointments?search=${encodeURIComponent(patientSearchQuery.trim())}`);
        }
    };

    if (isSessionLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
                <p className="text-text-main dark:text-white">Cargando...</p>
            </div>
        );
    }

    const userName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Usuario';
    const userRole = user?.user_metadata?.role || 'Admin';
    const userEmail = user?.email || '';
    const userAvatar = user?.user_metadata?.avatar_url || null;


    const sidebarContent = (
        <div className="flex flex-col h-full bg-surface-light dark:bg-surface-dark">
            <div className="p-6 pb-2">
                <div className="flex items-center gap-3">
                    <div className="bg-white p-1 rounded-xl shadow-sm border border-[#e7f3f2] dark:border-white/10 overflow-hidden size-12 flex items-center justify-center">
                        <img src="/logo-hospital.png" alt="Hospital Logo" className="size-full object-contain" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-text-main dark:text-white text-base font-bold leading-tight">E.S.E. Cantagallo</h1>
                        <p className="text-text-secondary text-[10px] font-medium uppercase tracking-wider">Laura AI Assistant</p>
                    </div>
                </div>
            </div>
            <nav className="flex-1 px-4 py-6 flex flex-col gap-2 overflow-y-auto">
                <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/dashboard' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/dashboard">
                    <span className={`material-symbols-outlined ${location.pathname === '/dashboard' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>dashboard</span>
                    <p className={`text-sm font-semibold ${location.pathname === '/dashboard' ? 'text-text-main dark:text-white' : ''}`}>Dashboard</p>
                </Link>
                {isAdmin && (
                    <>
                        <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/messages' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/messages">
                            <span className={`material-symbols-outlined ${location.pathname === '/messages' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>chat</span>
                            <p className={`text-sm font-medium ${location.pathname === '/messages' ? 'text-text-main dark:text-white' : ''}`}>Mensajes</p>
                        </Link>
                        {/* <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/patients' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/patients">
                            <span className={`material-symbols-outlined ${location.pathname === '/patients' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>groups</span>
                            <p className={`text-sm font-medium ${location.pathname === '/patients' ? 'text-text-main dark:text-white' : ''}`}>Pacientes</p>
                        </Link> */}
                    </>
                )}
                <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/appointments' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/appointments">
                    <span className={`material-symbols-outlined ${location.pathname === '/appointments' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>calendar_month</span>
                    <p className={`text-sm font-medium ${location.pathname === '/appointments' ? 'text-text-main dark:text-white' : ''}`}>Citas</p>
                </Link>
                {isAdmin && (
                    <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/admin' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/admin">
                        <span className={`material-symbols-outlined ${location.pathname === '/admin' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>campaign</span>
                        <p className={`text-sm font-medium ${location.pathname === '/admin' ? 'text-text-main dark:text-white' : ''}`}>Comunicados</p>
                    </Link>
                )}
                {isAdmin && (
                    <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/doctors' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/doctors">
                        <span className={`material-symbols-outlined ${location.pathname === '/doctors' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>stethoscope</span>
                        <p className={`text-sm font-medium ${location.pathname === '/doctors' ? 'text-text-main dark:text-white' : ''}`}>Médicos</p>
                    </Link>
                )}
                {isAdmin && (
                    <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/users' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/users">
                        <span className={`material-symbols-outlined ${location.pathname === '/users' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>group</span>
                        <p className={`text-sm font-medium ${location.pathname === '/users' ? 'text-text-main dark:text-white' : ''}`}>Usuarios</p>
                    </Link>
                )}
                {isAdmin && (
                    <>
                        <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/reports' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/reports">
                            <span className={`material-symbols-outlined ${location.pathname === '/reports' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>analytics</span>
                            <p className={`text-sm font-medium ${location.pathname === '/reports' ? 'text-text-main dark:text-white' : ''}`}>Reportes</p>
                        </Link>
                        <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/settings' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/settings">
                            <span className={`material-symbols-outlined ${location.pathname === '/settings' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>settings</span>
                            <p className={`text-sm font-medium ${location.pathname === '/settings' ? 'text-text-main dark:text-white' : ''}`}>Configuración</p>
                        </Link>
                    </>
                )}
                <div className="mt-auto pt-4 border-t border-[#e7f3f2] dark:border-[#2a3c3b]">
                    <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/help' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/help">
                        <span className={`material-symbols-outlined ${location.pathname === '/help' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>help_outline</span>
                        <p className={`text-sm font-medium ${location.pathname === '/help' ? 'text-text-main dark:text-white' : ''}`}>Ayuda</p>
                    </Link>
                </div>
            </nav>
            <div className="p-4 border-t border-[#e7f3f2] dark:border-[#2a3c3b]">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 rounded-xl h-12 bg-primary hover:bg-primary-dark transition-colors text-text-main font-bold text-sm tracking-wide shadow-sm shadow-primary/20"
                >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    <span>Cerrar sesión</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="bg-background-light dark:bg-background-dark text-text-main h-screen overflow-hidden flex">
            {/* Side Navigation Bar */}
            <aside className="w-72 border-r border-[#e7f3f2] dark:border-[#2a3c3b] hidden md:flex flex-col flex-shrink-0 transition-all z-20">
                {sidebarContent}
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark relative">
                {/* Top Header */}
                <header className="h-20 bg-surface-light dark:bg-surface-dark border-b border-[#e7f3f2] dark:border-[#2a3c3b] flex items-center justify-between px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <Sheet>
                            <SheetTrigger asChild>
                                <button className="md:hidden p-2 text-text-main hover:bg-gray-100 rounded-lg">
                                    <span className="material-symbols-outlined">menu</span>
                                </button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 w-72">
                                {sidebarContent}
                            </SheetContent>
                        </Sheet>
                        <div className="hidden sm:flex items-center justify-center size-10 rounded-full bg-primary/10 text-primary-dark">
                            <span className="material-symbols-outlined">dentistry</span>
                        </div>
                        <div>
                            <h2 className="text-text-main dark:text-white text-lg font-bold leading-tight">{clinicSettings.name}</h2>
                            <p className="text-text-secondary text-xs hidden sm:block">{clinicSettings.branch}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6">
                        <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center bg-[#f2f8f7] dark:bg-white/5 rounded-xl h-10 px-3 w-64 border border-transparent focus-within:border-primary/50 transition-colors">
                            <span className="material-symbols-outlined text-text-secondary dark:text-gray-400 text-[20px]">search</span>
                            <input
                                className="bg-transparent border-none outline-none focus:ring-0 text-sm w-full text-text-main dark:text-white placeholder:text-text-secondary/70 ml-2"
                                placeholder="Buscar paciente en citas..."
                                type="text"
                                value={patientSearchQuery}
                                onChange={(e) => setPatientSearchQuery(e.target.value)}
                            />
                        </form>
                        <div className="h-8 w-[1px] bg-[#e7f3f2] dark:bg-[#2a3c3b] hidden sm:block"></div>

                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="relative p-2 rounded-full hover:bg-[#f2f8f7] dark:hover:bg-white/5 transition-colors text-text-main dark:text-white">
                                    <Bell className="size-5" />
                                    {unreadNotificationsCount > 0 && (
                                        <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-surface-light dark:border-surface-dark"></span>
                                    )}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0 mr-4 mt-2" align="end">
                                <div className="p-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
                                    <h3 className="font-bold text-sm">Notificaciones</h3>
                                    {unreadNotificationsCount > 0 && (
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-xs text-primary-dark hover:underline flex items-center gap-1"
                                        >
                                            <Check className="size-3" /> Marcar todo como leído
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-[300px] overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center flex flex-col items-center gap-2 opacity-60">
                                            <BellOff className="size-8" />
                                            <p className="text-xs">No tienes notificaciones</p>
                                        </div>
                                    ) : (
                                        notifications.map(n => (
                                            <div
                                                key={n.id}
                                                className={`p-4 border-b border-border-light dark:border-border-dark last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer relative ${!n.is_read ? 'bg-primary/5' : ''}`}
                                                onClick={() => !n.is_read && markAsRead(n.id)}
                                            >
                                                {!n.is_read && <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full"></div>}
                                                <h4 className="text-sm font-bold mb-1">{n.title}</h4>
                                                <p className="text-xs text-text-secondary line-clamp-2 mb-2">{n.content}</p>
                                                <span className="text-[10px] text-text-secondary opacity-70">
                                                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {notifications.length > 0 && (
                                    <div className="p-2 border-t border-border-light dark:border-border-dark text-center">
                                        <button className="text-[11px] font-bold text-text-secondary hover:text-primary transition-colors">
                                            Ver todas las notificaciones
                                        </button>
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>
                        <ProfileDropdown
                            userName={userName}
                            userRole={userRole}
                            userEmail={userEmail}
                            userAvatar={userAvatar}
                        />
                    </div>
                </header>

                {/* Scrollable Main Content */}
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
