import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Megaphone, Loader2 } from 'lucide-react';

interface Announcement {
    id: string;
    title: string;
    content: string;
    type: 'info' | 'warning' | 'success' | 'error';
    is_active: boolean;
    created_at: string;
}

const Admin = () => {
    const { user, isLoading: isSessionLoading } = useSession();
    const navigate = useNavigate();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [newAnnouncement, setNewAnnouncement] = useState({
        title: '',
        content: '',
        type: 'info' as 'info' | 'warning' | 'success' | 'error'
    });

    const isAdmin = user?.user_metadata?.role === 'admin';

    useEffect(() => {
        if (!isSessionLoading) {
            if (!user || !isAdmin) {
                showError('Acceso denegado. Se requieren permisos de administrador.');
                navigate('/dashboard');
            } else {
                fetchAnnouncements();
            }
        }
    }, [user, isSessionLoading, isAdmin, navigate]);

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAnnouncements(data || []);
        } catch (error: any) {
            console.error('Error fetching announcements:', error);
            // No mostrar error si el usuario no tiene permisos aún
            if (user && isAdmin) {
                showError('Error al cargar anuncios: ' + (error.message || 'Error desconocido'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAnnouncement.title || !newAnnouncement.content) {
            showError('Por favor completa el título y contenido del anuncio.');
            return;
        }

        try {
            const { error } = await supabase
                .from('announcements')
                .insert({
                    ...newAnnouncement,
                    created_by: user?.id
                });

            if (error) throw error;

            showSuccess('Anuncio creado correctamente.');
            setNewAnnouncement({ title: '', content: '', type: 'info' });
            fetchAnnouncements();
        } catch (error: any) {
            console.error('Error creating announcement:', error);
            showError('Error al crear el anuncio: ' + error.message);
        }
    };

    const handleToggleAnnouncementStatus = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('announcements')
                .update({ is_active: !currentStatus })
                .eq('id', id);

            if (error) throw error;

            showSuccess('Estado del anuncio actualizado.');
            fetchAnnouncements();
        } catch (error: any) {
            console.error('Error toggling announcement status:', error);
            showError('Error al actualizar el anuncio: ' + error.message);
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este anuncio?')) return;

        try {
            const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', id);

            if (error) throw error;

            showSuccess('Anuncio eliminado.');
            fetchAnnouncements();
        } catch (error: any) {
            console.error('Error deleting announcement:', error);
            showError('Error al eliminar el anuncio: ' + error.message);
        }
    };

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark relative">
            <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-10">
                <div className="max-w-6xl mx-auto flex flex-col gap-8 mt-8">
                    <div>
                        <h1 className="text-2xl font-bold text-text-main dark:text-white tracking-tight">Comunicados Internos</h1>
                        <p className="text-text-secondary mt-1">Gestiona los anuncios generales que aparecerán en el dashboard de todos los usuarios.</p>
                    </div>

                    {(isSessionLoading || loading && announcements.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="size-10 animate-spin text-primary" />
                            <p className="text-text-secondary font-medium animate-pulse">Cargando panel de control...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
                            <Card className="bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark overflow-hidden shadow-sm h-fit">
                                <CardHeader className="border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-white/5">
                                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                                        <Megaphone className="size-5 text-primary" />
                                        Nuevo Comunicado
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="ann-title">Título del Anuncio</Label>
                                            <Input
                                                id="ann-title"
                                                placeholder="Ej: Mantenimiento del sistema"
                                                value={newAnnouncement.title}
                                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                                className="bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ann-type">Tipo de Alerta</Label>
                                            <Select
                                                value={newAnnouncement.type}
                                                onValueChange={(val: any) => setNewAnnouncement({ ...newAnnouncement, type: val })}
                                            >
                                                <SelectTrigger className="bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark">
                                                    <SelectValue placeholder="Seleccionar tipo" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark text-text-main dark:text-white">
                                                    <SelectItem value="info">Información (Azul)</SelectItem>
                                                    <SelectItem value="success">Éxito (Verde)</SelectItem>
                                                    <SelectItem value="warning">Advertencia (Amarillo)</SelectItem>
                                                    <SelectItem value="error">Error (Rojo)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ann-content">Contenido del Mensaje</Label>
                                            <Textarea
                                                id="ann-content"
                                                placeholder="Escribe el mensaje aquí..."
                                                rows={4}
                                                value={newAnnouncement.content}
                                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                                                className="bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark resize-none"
                                            />
                                        </div>
                                        <Button type="submit" className="w-full bg-primary hover:bg-primary-dark text-teal-950 font-bold h-11">
                                            Publicar Ahora
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            <Card className="bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark overflow-hidden shadow-sm">
                                <CardHeader className="border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-white/5">
                                    <CardTitle className="text-lg font-bold">Historial de Comunicados</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="max-h-[500px] overflow-y-auto">
                                        {loading ? (
                                            <div className="p-12 flex flex-col items-center justify-center text-text-secondary gap-3">
                                                <Loader2 className="size-8 animate-spin text-primary" />
                                                <p className="text-sm font-medium">Cargando anuncios...</p>
                                            </div>
                                        ) : announcements.length === 0 ? (
                                            <div className="p-12 text-center text-text-secondary opacity-60 flex flex-col items-center gap-3">
                                                <Megaphone className="size-10 opacity-20" />
                                                <p>No hay anuncios creados.</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-border-light dark:divide-border-dark">
                                                {announcements.map((ann: Announcement) => (
                                                    <div key={ann.id} className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                        <div className="space-y-1.5 min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`size-2.5 rounded-full ${ann.type === 'info' ? 'bg-blue-500' :
                                                                    ann.type === 'success' ? 'bg-green-500' :
                                                                        ann.type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                                                                    }`}></span>
                                                                <h5 className="font-bold text-sm text-text-main dark:text-white truncate">{ann.title}</h5>
                                                                {!ann.is_active && (
                                                                    <span className="text-[10px] bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded uppercase font-bold text-text-secondary">Inactivo</span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">{ann.content}</p>
                                                            <span className="text-[10px] text-text-secondary opacity-60">
                                                                {new Date(ann.created_at).toLocaleDateString()} {new Date(ann.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                                            <Switch
                                                                checked={ann.is_active}
                                                                onCheckedChange={() => handleToggleAnnouncementStatus(ann.id, ann.is_active)}
                                                                title={ann.is_active ? 'Desactivar' : 'Activar'}
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-9 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                                                                onClick={() => handleDeleteAnnouncement(ann.id)}
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Admin;
