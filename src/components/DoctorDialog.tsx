import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showError } from '@/utils/toast';

interface Doctor {
  id: string;
  user_id?: string;
  avatar_url: string;
  full_name: string;
  specialty: string;
  status: boolean;
  created_at: string;
  updated_at: string;
}

interface DoctorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doctorData: Omit<Doctor, 'id' | 'created_at' | 'updated_at'>, id?: string) => void;
  doctor: Doctor | null; // Null for adding, Doctor object for editing
}

const DoctorDialog: React.FC<DoctorDialogProps> = ({ isOpen, onClose, onSave, doctor }) => {
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [status, setStatus] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (doctor) {
      setFullName(doctor.full_name);
      setSpecialty(doctor.specialty);
      setAvatarUrl(doctor.avatar_url);
      setStatus(doctor.status);
    } else {
      // Reset form for new doctor
      setFullName('');
      setSpecialty('');
      setAvatarUrl('');
      setStatus(true);
    }
  }, [doctor, isOpen]); // Reset when dialog opens or doctor changes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!fullName || !specialty) {
      showError('Por favor, completa todos los campos obligatorios.');
      setIsLoading(false);
      return;
    }

    const doctorData: Omit<Doctor, 'id' | 'created_at' | 'updated_at'> = {
      full_name: fullName,
      specialty: specialty,
      avatar_url: avatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBKGJqOrxKC8dOGnL2B3rcuN8cbystShMdVLZ1f22GeobGXHdn17h731ohnBgSFGJzHSaFFsKSuto3ONj63pIfPpeClcp3tWAb-bclE_Hdvuy0R-QbHkMZiM6WYYc3nXNPjiDH0EMCfTWpN1A8GBrVRx2om-uuCNIMSN-DSrG8z2WZluh5jVJxmObR7BrX_OOftM87dob0SyNkuMtcrKkmQBolg7ESQ8bWASHic7KVtOqf3B-tpEFB-W_Ojbd_zMuoMOU5VqJiH_A', // Default avatar if none provided
      status: status,
    };

    await onSave(doctorData, doctor?.id);
    setIsLoading(false);
  };

  const specialties = ['Cardiología', 'Pediatría', 'Dermatología', 'Neurología', 'Odontología', 'General'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-surface-light dark:bg-surface-dark text-text-main dark:text-white">
        <DialogHeader>
          <DialogTitle>{doctor ? 'Editar Médico' : 'Agregar Nuevo Médico'}</DialogTitle>
          <DialogDescription>
            {doctor ? 'Modifica los detalles del médico.' : 'Introduce la información para un nuevo médico.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="fullName" className="text-right">
              Nombre Completo
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="col-span-3 bg-background-light dark:bg-background-dark text-text-main dark:text-white border-border-color dark:border-slate-700"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="specialty" className="text-right">
              Especialidad
            </Label>
            <Select value={specialty} onValueChange={setSpecialty} required>
              <SelectTrigger className="col-span-3 bg-background-light dark:bg-background-dark text-text-main dark:text-white border-border-color dark:border-slate-700">
                <SelectValue placeholder="Selecciona una especialidad" />
              </SelectTrigger>
              <SelectContent className="bg-surface-light dark:bg-surface-dark text-text-main dark:text-white border-border-color dark:border-slate-700">
                {specialties.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="avatarUrl" className="text-right">
              URL Avatar
            </Label>
            <Input
              id="avatarUrl"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="col-span-3 bg-background-light dark:bg-background-dark text-text-main dark:text-white border-border-color dark:border-slate-700"
              placeholder="Opcional"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Activo
            </Label>
            <Switch
              id="status"
              checked={status}
              onCheckedChange={setStatus}
              className="col-span-3"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DoctorDialog;