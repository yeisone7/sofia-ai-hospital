import { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Appointment } from '@/types/common';
import { format, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface CalendarViewProps {
    appointments: Appointment[];
    onSelectDate: (date: Date | undefined) => void;
}

export default function CalendarView({ appointments, onSelectDate }: CalendarViewProps) {
    const [date, setDate] = useState<Date | undefined>(new Date());

    // Group appointments by date
    const appointmentsByDate = useMemo(() => {
        const map = new Map<string, Appointment[]>();
        appointments.forEach(app => {
            // Assuming appointment_date is ISO string "YYYY-MM-DDTHH:mm:ss"
            // We extract YYYY-MM-DD
            const dateKey = app.appointment_date.split('T')[0];
            if (!map.has(dateKey)) {
                map.set(dateKey, []);
            }
            map.get(dateKey)?.push(app);
        });
        return map;
    }, [appointments]);

    const handleSelect = (newDate: Date | undefined) => {
        setDate(newDate);
        onSelectDate(newDate);
    };

    // Custom Day Content to show dots
    const components = {
        DayContent: (props: any) => {
            const { date: dayDate, activeModifiers } = props;
            const dateKey = format(dayDate, 'yyyy-MM-dd');
            const dayApps = appointmentsByDate.get(dateKey) || [];
            const hasApps = dayApps.length > 0;
            const confirmedCount = dayApps.filter(a => a.status === 'confirmed').length;
            const pendingCount = dayApps.filter(a => a.status === 'pending').length;

            return (
                <div className="relative flex items-center justify-center size-full h-9 w-9 p-0 font-normal aria-selected:opacity-100">
                    <span>{dayDate.getDate()}</span>
                    {hasApps && (
                        <div className="absolute bottom-1flex gap-0.5 justify-center">
                            {confirmedCount > 0 && <div className="size-1 rounded-full bg-green-500 mx-[1px]" />}
                            {pendingCount > 0 && <div className="size-1 rounded-full bg-orange-400 mx-[1px]" />}
                        </div>
                    )}
                </div>
            )
        }
    }

    return (
        <div className="flex flex-col md:flex-row gap-6">
            <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-border-light dark:border-border-dark shadow-sm w-fit h-fit">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleSelect}
                    locale={es}
                    className="rounded-md border-0"
                />
            </div>

            <div className="flex-1 bg-surface-light dark:bg-surface-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm min-h-[400px]">
                <h3 className="text-xl font-bold text-text-main dark:text-white mb-4">
                    {date ? format(date, "EEEE, d 'de' MMMM", { locale: es }) : 'Selecciona una fecha'}
                </h3>

                {date && (
                    <div className="space-y-3">
                        {appointments.filter(app => isSameDay(parseISO(app.appointment_date), date)).length === 0 ? (
                            <p className="text-text-secondary text-sm">No hay citas para este día.</p>
                        ) : (
                            appointments
                                .filter(app => isSameDay(parseISO(app.appointment_date), date))
                                .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
                                .map(app => (
                                    <div key={app.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-border-light dark:border-transparent hover:border-primary/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col items-center justify-center bg-white dark:bg-black/20 size-10 rounded-lg text-xs font-bold text-text-main dark:text-white shadow-sm">
                                                {format(parseISO(app.appointment_date), 'HH:mm')}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-text-main dark:text-white">{app.patient_name}</p>
                                                <p className="text-xs text-text-secondary">{app.appointment_type}</p>
                                            </div>
                                        </div>
                                        <Badge variant={
                                            app.status === 'confirmed' ? 'default' :
                                                app.status === 'pending' ? 'secondary' : 'destructive'
                                        }>
                                            {app.status === 'confirmed' ? 'Confirmada' :
                                                app.status === 'pending' ? 'Pendiente' : app.status}
                                        </Badge>
                                    </div>
                                ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
