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
import { supabase } from '@/integrations/supabase/client'; // Import supabase client

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
  const [avatarFile, setAvatarFile] = useState<File | null>(null); // State for the selected file
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null); // State for image preview
  const [status, setStatus] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const DEFAULT_AVATAR_URL = '/default-doctor-avatar.png';

  useEffect(() => {
    if (doctor) {
      setFullName(doctor.full_name);
      setSpecialty(doctor.specialty);
      setStatus(doctor.status);
      setAvatarFile(null); // Clear file input on edit
      setAvatarPreviewUrl(doctor.avatar_url); // Set preview to existing avatar
    } else {
      // Reset form for new doctor
      setFullName('');
      setSpecialty('');
      setStatus(true);
      setAvatarFile(null);
      setAvatarPreviewUrl(null); // No preview for new doctor initially
    }
  }, [doctor, isOpen]); // Reset when dialog opens or doctor changes

  useEffect(() => {
    if (avatarFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(avatarFile);
    } else if (!doctor) { // If it's a new doctor and no file is selected
      setAvatarPreviewUrl(null);
    } else if (doctor && !avatarFile) { // If editing and no new file, keep existing avatar
      setAvatarPreviewUrl(doctor.avatar_url);
    }
  }, [avatarFile, doctor]);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    } else {
      setAvatarFile(null);
      // If no file selected, revert to existing avatar_url or default
      setAvatarPreviewUrl(doctor?.avatar_url || null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!fullName || !specialty) {
      showError('Por favor, completa todos los campos obligatorios.');
      setIsLoading(false);
      return;
    }

    let finalAvatarUrl = doctor?.avatar_url || ''; // Start with existing URL or empty string

    if (avatarFile) {
      const fileExtension = avatarFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
      const filePath = `doctor_avatars/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('doctor-avatars') // This bucket needs to be created in Supabase
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        showError('Error al subir la imagen: ' + uploadError.message);
        setIsLoading(false);
        return;
      }
      finalAvatarUrl = supabase.storage.from('doctor-avatars').getPublicUrl(filePath).data.publicUrl;
    } else if (!finalAvatarUrl) { // If no file uploaded and no existing URL, use default
      finalAvatarUrl = DEFAULT_AVATAR_URL;
    }

    const doctorData: Omit<Doctor, 'id' | 'created_at' | 'updated_at'> = {
      full_name: fullName,
      specialty: specialty,
      avatar_url: finalAvatarUrl,
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
            <Label htmlFor="avatarFile" className="text-right">
              Avatar
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              {avatarPreviewUrl ? (
                <img src={avatarPreviewUrl} alt="Avatar Preview" className="size-12 rounded-full object-cover" />
              ) : (
                <div className="size-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {getInitials(fullName || 'Nuevo Médico')}
                </div>
              )}
              <Input
                id="avatarFile"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="flex-1 bg-background-light dark:bg-background-dark text-text-main dark:text-white border-border-color dark:border-slate-700"
              />
              {(avatarPreviewUrl && avatarPreviewUrl !== DEFAULT_AVATAR_URL) && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setAvatarFile(null);
                    setAvatarPreviewUrl(null); // Clear preview, will fallback to default or initials
                  }}
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </Button>
              )}
            </div>
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