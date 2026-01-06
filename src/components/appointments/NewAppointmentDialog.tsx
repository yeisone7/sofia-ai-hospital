import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from '@/integrations/supabase/session-context';

// Fixed slots matching backend rules
const FIXED_SLOTS = [
    "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
    "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30"
];

interface NewAppointmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export default function NewAppointmentDialog({ open, onOpenChange, onSuccess }: NewAppointmentDialogProps) {
    const { user } = useSession();
    const [loading, setLoading] = useState(false);

    // Form States
    const [patientName, setPatientName] = useState('');
    const [phone, setPhone] = useState('');
    const [identificationNumber, setIdentificationNumber] = useState('');
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [time, setTime] = useState('');
    const [type, setType] = useState('Consulta General');
    const [bookedSlots, setBookedSlots] = useState<string[]>([]);

    // Validation States
    const [dateError, setDateError] = useState<string | null>(null);

    // Reset form and fetch profile when opening
    useEffect(() => {
        const initializeProfileData = async () => {
            if (!open || !user) return;

            // Try to get from metadata first for speed
            const metaFirst = user.user_metadata?.first_name || '';
            const metaLast = user.user_metadata?.last_name || '';
            const metaFull = user.user_metadata?.full_name || '';
            const metaId = user.user_metadata?.id_number || '';

            if (metaFirst || metaLast) {
                setPatientName(`${metaFirst} ${metaLast}`.trim());
            } else if (metaFull) {
                setPatientName(metaFull);
            }

            if (metaId) {
                setIdentificationNumber(metaId);
            }

            // Always try to get fresh data from profiles table
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('first_name, last_name, id_number, phone_number')
                    .eq('id', user.id)
                    .maybeSingle();

                if (data) {
                    if (data.first_name || data.last_name) {
                        setPatientName(`${data.first_name || ''} ${data.last_name || ''}`.trim());
                    }
                    if (data.id_number) {
                        setIdentificationNumber(data.id_number);
                    }
                    if (data.phone_number && !phone) {
                        setPhone(data.phone_number);
                    }
                }
            } catch (err) {
                console.error('Error fetching profile details:', err);
            }
        };

        if (open) {
            setPatientName('');
            setPhone('');
            setIdentificationNumber('');
            setDate(addDays(new Date(), 1)); // Set to tomorrow by default
            setTime('');
            setType('Consulta General');
            setDateError(null);
            setBookedSlots([]);
            initializeProfileData();
        }
    }, [open, user]);

    // Lookup patient by phone number (Keep as secondary or remove? 
    // User wants it to bring from logged user and disable, so this lookup is likely redundant now)
    // I'll comment it out or remove it to avoid confusion if fields are disabled.
    /*
    useEffect(() => {
        const lookupPatient = async () => {
            if (phone.length < 10) return; 

            try {
                const { data, error } = await supabase
                    .from('patients')
                    .select('first_name, last_name, id_number')
                    .eq('phone', phone)
                    .eq('user_id', user?.id)
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    setPatientName(`${data.first_name} ${data.last_name}`);
                    if (data.id_number) setIdentificationNumber(data.id_number);
                }
            } catch (err) {
                console.error('Error looking up patient:', err);
            }
        };

        const timer = setTimeout(() => {
            lookupPatient();
        }, 500); 

        return () => clearTimeout(timer);
    }, [phone, user?.id]);
    */

    // Fetch booked slots when date changes
    useEffect(() => {
        const fetchBookedSlots = async () => {
            if (!date) return;

            const dateStr = format(date, 'yyyy-MM-dd');
            const { data, error } = await supabase
                .from('appointments')
                .select('appointment_date')
                .gte('appointment_date', `${dateStr}T00:00:00`)
                .lte('appointment_date', `${dateStr}T23:59:59`)
                .neq('status', 'cancelled');

            if (error) {
                console.error('Error fetching booked slots:', error);
                return;
            }

            // Simple logic: If a slot is taken, it's blocked.
            const booked = data.map(app => {
                const d = new Date(app.appointment_date);
                return format(d, 'HH:mm');
            });
            setBookedSlots(booked);
        };

        fetchBookedSlots();
    }, [date]);

    // Validate Date (Tomorrow Rule)
    useEffect(() => {
        if (date) {
            const tomorrow = addDays(new Date(), 1);
            if (!isSameDay(date, tomorrow)) {
                setDateError("Por política de la clínica, la IA solo agenda para mañana. (Puedes forzarlo manualmente si es necesario)");
            } else {
                setDateError(null);
            }
        }
    }, [date]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || !time || !patientName || !phone) {
            showError("Por favor completa todos los campos obligatorios.");
            return;
        }

        setLoading(true);
        try {
            // Fix: Construct date accurately to avoid timezone offset issues (7am -> 2am bug)
            const appointmentDate = new Date(date);
            const [hours, minutes] = time.split(':').map(Number);
            appointmentDate.setHours(hours, minutes, 0, 0);

            // The ISO string will contain the UTC equivalent, and Supabase will handle the timestamptz conversion properly.
            const startDateTime = appointmentDate.toISOString();
            const dateStr = format(date, 'yyyy-MM-dd');

            // Rule: 1 appointment per user/patient per phone day
            // Simplified check for manual booking: check if this patient already has a slot today
            const { data: existingPatientApp } = await supabase
                .from('appointments')
                .select('id')
                .eq('user_id', user?.id)
                .eq('phone_number', phone)
                .gte('appointment_date', `${dateStr}T00:00:00`)
                .lte('appointment_date', `${dateStr}T23:59:59`)
                .neq('status', 'cancelled');

            if (existingPatientApp && existingPatientApp.length > 0) {
                showError("Este paciente ya tiene una cita para este día.");
                setLoading(false);
                return;
            }

            // Check for blocked slots
            const { data: blocked } = await supabase
                .from('blocked_slots')
                .select('*')
                .eq('date', dateStr)
                .eq('start_time', time + ':00')
                .single();

            if (blocked) {
                showError(`El horario ${time} está bloqueado manualmente.`);
                setLoading(false);
                return;
            }

            // Double check availability
            const { data: existing } = await supabase
                .from('appointments')
                .select('*')
                .eq('appointment_date', startDateTime)
                .neq('status', 'cancelled')
                .maybeSingle();

            if (existing) {
                showError(`El horario ${time} ya no está disponible.`);
                setLoading(false);
                return;
            }

            // Insert Appointment
            const { error } = await supabase.from('appointments').insert({
                user_id: user?.id,
                patient_name: patientName,
                phone_number: phone,
                appointment_date: startDateTime,
                appointment_type: type,
                doctor_id: null,
                status: 'confirmed' as 'confirmed',
                patient_id_number: identificationNumber,
                notes: 'Creada manualmente desde Dashboard'
            });

            if (error) throw error;

            showSuccess('Cita creada exitosamente.');
            onSuccess();
            onOpenChange(false);

        } catch (error: any) {
            console.error('Error creating appointment:', error);
            showError('Error al crear la cita: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nueva Cita</DialogTitle>
                    <DialogDescription>
                        Agenda una nueva cita manualmente.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-4 py-4">

                    <div className="grid gap-2">
                        <Label htmlFor="patientName">Nombre del Paciente *</Label>
                        <Input
                            id="patientName"
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                            placeholder="Nombre completo"
                            required
                            disabled
                            className="bg-gray-50 dark:bg-white/5 opacity-70 cursor-not-allowed"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="identification">Número de Identificación</Label>
                            <Input
                                id="identification"
                                value={identificationNumber}
                                onChange={(e) => setIdentificationNumber(e.target.value)}
                                placeholder="CC/TI/CE"
                                disabled
                                className="bg-gray-50 dark:bg-white/5 opacity-70 cursor-not-allowed"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Teléfono *</Label>
                            <Input
                                id="phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Ej. +5212345678"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Fecha *</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    disabled
                                    className={cn(
                                        "justify-start text-left font-normal",
                                        !date && "text-muted-foreground",
                                        "bg-gray-50 dark:bg-white/5 opacity-70 cursor-not-allowed"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                    locale={es}
                                    disabled={(date) => date < new Date() && !isSameDay(date, new Date())} // Disable past dates
                                />
                            </PopoverContent>
                        </Popover>
                        {dateError && <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">{dateError}</p>}
                    </div>

                    <div className="grid gap-3">
                        <Label className="text-sm font-bold text-text-secondary">Selecciona un Horario *</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                            {FIXED_SLOTS.map((slot) => {
                                const isBooked = bookedSlots.includes(slot);
                                const isSelected = time === slot;
                                return (
                                    <button
                                        key={slot}
                                        type="button"
                                        disabled={isBooked}
                                        onClick={() => setTime(slot)}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all h-20 text-center gap-1",
                                            isBooked
                                                ? "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed border-dashed"
                                                : isSelected
                                                    ? "bg-primary border-primary text-text-main shadow-md ring-2 ring-primary/20 scale-[1.02]"
                                                    : "bg-surface-light dark:bg-surface-dark border-[#e7f3f2] dark:border-[#2a3c3b] hover:border-primary/50 group"
                                        )}
                                    >
                                        <span className={cn(
                                            "text-sm font-bold",
                                            isSelected ? "text-text-main" : isBooked ? "text-slate-400" : "text-text-main dark:text-white"
                                        )}>
                                            {slot}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <span className={cn(
                                                "text-[10px] uppercase font-bold tracking-wider",
                                                isSelected ? "text-text-main/80" : isBooked ? "text-slate-400" : "text-text-secondary"
                                            )}>
                                                {isBooked ? 'Ocupado' : isSelected ? 'Seleccionado' : 'Disponible'}
                                            </span>
                                            {!isBooked && !isSelected && (
                                                <span className="material-symbols-outlined text-[14px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">add_circle</span>
                                            )}
                                            {isSelected && (
                                                <span className="material-symbols-outlined text-[14px] text-text-main">check_circle</span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="type">Tipo</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Consulta General">Consulta General</SelectItem>
                                <SelectItem value="Seguimiento">Seguimiento</SelectItem>
                                <SelectItem value="Urgencia">Urgencia</SelectItem>
                                <SelectItem value="Análisis">Análisis</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Agendar Cita
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
