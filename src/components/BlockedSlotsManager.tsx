import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

interface BlockedSlot {
    id: string;
    date: string;
    start_time: string;
    reason: string | null;
}

interface BlockedSlotsManagerProps {
    userId: string;
}

const FIXED_SLOTS = [
    "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30"
];

const BlockedSlotsManager = ({ userId }: BlockedSlotsManagerProps) => {
    const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [reason, setReason] = useState('');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        if (userId) {
            fetchBlockedSlots();
        }
    }, [userId]);

    const fetchBlockedSlots = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('blocked_slots')
            .select('*')
            .eq('clinic_id', userId)
            .gte('date', new Date().toISOString().split('T')[0]) // Only future or today
            .order('date', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) {
            console.error('Error fetching blocked slots:', error);
            showError('Error al cargar horarios bloqueados');
        } else {
            setBlockedSlots(data || []);
        }
        setLoading(false);
    };

    const handleAddBlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate || !selectedTime) {
            showError('Por favor selecciona fecha y hora');
            return;
        }
        setAdding(true);

        const { data, error } = await supabase
            .from('blocked_slots')
            .insert({
                clinic_id: userId,
                date: selectedDate,
                start_time: selectedTime,
                reason: reason || 'Bloqueo manual'
            })
            .select()
            .single();

        if (error) {
            console.error('Error adding blocked slot:', error);
            showError('Error al bloquear horario: ' + error.message);
        } else {
            showSuccess('Horario bloqueado correctamente');
            setReason('');
            fetchBlockedSlots();
        }
        setAdding(false);
    };

    const handleDeleteBlock = async (id: string) => {
        const { error } = await supabase
            .from('blocked_slots')
            .delete()
            .eq('id', id);

        if (error) {
            showError('Error al eliminar bloqueo');
        } else {
            showSuccess('Bloqueo eliminado');
            setBlockedSlots(prev => prev.filter(slot => slot.id !== id));
        }
    };

    if (loading && blockedSlots.length === 0) return <div className="text-sm text-gray-500">Cargando...</div>;

    return (
        <div className="flex flex-col gap-6">

            {/* Add Block Form */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-bold text-text-main dark:text-white mb-3">Bloquear Nuevo Horario</h4>
                <form onSubmit={handleAddBlock} className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex flex-col gap-1 w-full md:w-auto">
                        <label className="text-xs font-semibold text-text-secondary dark:text-gray-400">Fecha</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            required
                        />
                    </div>
                    <div className="flex flex-col gap-1 w-full md:w-auto">
                        <label className="text-xs font-semibold text-text-secondary dark:text-gray-400">Hora</label>
                        <select
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            required
                        >
                            <option value="">Seleccionar hora</option>
                            {FIXED_SLOTS.map(slot => (
                                <option key={slot} value={slot}>{slot}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1 flex-1 w-full">
                        <label className="text-xs font-semibold text-text-secondary dark:text-gray-400">Motivo (Opcional)</label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ej: Reunión personal"
                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={adding}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                        {adding ? 'Bloqueando...' : 'Bloquear'}
                    </button>
                </form>
            </div>

            {/* List */}
            <div className="flex flex-col gap-2">
                <h4 className="text-sm font-bold text-text-main dark:text-white">Horarios Bloqueados (Futuros)</h4>
                {blockedSlots.length === 0 ? (
                    <p className="text-sm text-text-secondary dark:text-gray-400 italic">No hay horarios bloqueados manualmente.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {blockedSlots.map(slot => (
                            <div key={slot.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600 shadow-sm">
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm text-text-main dark:text-white">
                                        {new Date(slot.date + 'T00:00:00').toLocaleDateString()}
                                    </span>
                                    <span className="text-xs text-text-secondary dark:text-gray-300">
                                        {slot.start_time.substring(0, 5)} - {slot.reason}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleDeleteBlock(slot.id)}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                    title="Desbloquear"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};

export default BlockedSlotsManager;
