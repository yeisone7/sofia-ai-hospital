
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { showError, showSuccess } from '@/utils/toast';

interface RescheduleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointmentId: string | null;
    currentDate?: string;
    onSuccess: () => void;
}

const RescheduleDialog = ({
    open,
    onOpenChange,
    appointmentId,
    currentDate,
    onSuccess,
}: RescheduleDialogProps) => {
    const [date, setDate] = useState<Date | undefined>(
        currentDate ? new Date(currentDate) : new Date()
    );
    const [time, setTime] = useState<string>(
        currentDate ? new Date(currentDate).toTimeString().slice(0, 5) : '09:00'
    );
    const [loading, setLoading] = useState(false);

    const handleReschedule = async () => {
        if (!date || !time || !appointmentId) return;

        setLoading(true);
        try {
            // Combine date and time
            const newDateTime = new Date(date);
            const [hours, minutes] = time.split(':').map(Number);
            newDateTime.setHours(hours, minutes, 0, 0);

            const { error } = await supabase
                .from('appointments')
                .update({
                    appointment_date: newDateTime.toISOString(),
                    status: 'rescheduled',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', appointmentId);

            if (error) throw error;

            showSuccess('Cita reprogramada correctamente.');
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Error rescheduling appointment:', error);
            showError('Error al reprogramar la cita: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Generate time slots (every 30 mins)
    const timeSlots = [];
    for (let i = 8; i <= 18; i++) {
        timeSlots.push(`${i.toString().padStart(2, '0')}:00`);
        timeSlots.push(`${i.toString().padStart(2, '0')}:30`);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Reprogramar Cita</DialogTitle>
                    <DialogDescription>
                        Selecciona una nueva fecha y hora para la cita.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-main dark:text-white">Fecha</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-main dark:text-white">Hora</label>
                        <Select value={time} onValueChange={setTime}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar hora" />
                            </SelectTrigger>
                            <SelectContent>
                                {timeSlots.map((slot) => (
                                    <SelectItem key={slot} value={slot}>
                                        {slot}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleReschedule} disabled={!date || !time || loading}>
                        {loading ? 'Guardando...' : 'Confirmar Cambios'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default RescheduleDialog;
