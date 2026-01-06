import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { getInitials } from '@/lib/utils'; // Reintroducido

const Profile = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    idNumber: '',
    email: '',
    avatarUrl: '',
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null); // State for the selected file


  useEffect(() => {
    if (!isSessionLoading && !user) {
      navigate('/login');
    } else if (user) {
      fetchProfileData();
    }
  }, [user, isSessionLoading, navigate]);

  const fetchProfileData = async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url, id_number')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw error;
      }

      setProfileData({
        firstName: data?.first_name || user?.user_metadata?.first_name || '',
        lastName: data?.last_name || user?.user_metadata?.last_name || '',
        idNumber: data?.id_number || user?.user_metadata?.id_number || '',
        email: user?.email || '',
        avatarUrl: data?.avatar_url || user?.user_metadata?.avatar_url || '',
      });
      setAvatarFile(null); // Clear file input on fetch

    } catch (error: any) {
      console.error('Error fetching profile data:', error);
      setProfileError('No se pudo cargar la información del perfil.');
      showError('Error al cargar el perfil: ' + error.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return '';

    const fileExtension = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExtension}`;
    const filePath = `user_avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars') // Este bucket debe existir en Supabase Storage
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Sobreescribir si ya existe
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return publicUrlData.publicUrl;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setProfileError(null);
    try {
      let newAvatarUrl = profileData.avatarUrl;
      if (avatarFile) {
        newAvatarUrl = await handleAvatarUpload(avatarFile);
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          id_number: profileData.idNumber,
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (profileError) throw profileError;

      // Also update auth.users metadata if needed
      await supabase.auth.updateUser({
        data: {
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          id_number: profileData.idNumber,
          avatar_url: newAvatarUrl,
        },
      });

      setProfileData(prev => ({ ...prev, avatarUrl: newAvatarUrl }));
      setAvatarFile(null); // Clear file input after successful upload
      showSuccess('Perfil actualizado correctamente.');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setProfileError('Error al guardar el perfil: ' + error.message);
      showError('Error al guardar el perfil: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(e.target.files[0]);
    } else {
      setAvatarFile(null);
      // Revert to original avatar if file selection is cancelled
      fetchProfileData();
    }
  };




  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark relative">
      <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-10">
        {profileLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-text-main dark:text-white">Cargando perfil...</p>
          </div>
        ) : profileError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-4 bg-surface-light dark:bg-surface-dark rounded-lg shadow-md">
              <h3 className="text-lg font-bold text-red-600 mb-2">Error</h3>
              <p className="text-text-main dark:text-white">{profileError}</p>
              <button
                onClick={fetchProfileData}
                className="mt-4 bg-primary hover:bg-primary-dark text-teal-950 font-bold py-2 px-4 rounded-xl"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-[800px] mx-auto w-full px-6 py-8 md:px-12 md:py-10 pb-24">
            <div className="mb-8 md:mb-10">
              <div className="flex flex-col gap-2">
                <h1 className="text-text-main dark:text-white text-3xl md:text-4xl font-extrabold tracking-tight">Mi Perfil</h1>
                <p className="text-text-secondary dark:text-gray-400 text-base md:text-lg">Actualiza tu información personal y de contacto.</p>
              </div>
            </div>
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-8">
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 md:p-8 shadow-sm border border-border-color/50 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6 border-b border-border-color/50 dark:border-slate-700 pb-4">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary-dark dark:text-primary">
                    <span className="material-symbols-outlined">person</span>
                  </div>
                  <h2 className="text-lg font-bold text-text-main dark:text-white">Información Personal</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-text-main dark:text-gray-300">Nombre</span>
                    <input
                      className="w-full h-12 px-4 rounded-lg border border-border-color dark:border-slate-700 bg-background-light dark:bg-slate-900 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow placeholder:text-text-secondary/60"
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-text-main dark:text-gray-300">Apellido</span>
                    <input
                      className="w-full h-12 px-4 rounded-lg border border-border-color dark:border-slate-700 bg-background-light dark:bg-slate-900 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow placeholder:text-text-secondary/60"
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-text-main dark:text-gray-300">Número de Identificación</span>
                    <input
                      className="w-full h-12 px-4 rounded-lg border border-border-color dark:border-slate-700 bg-background-light dark:bg-slate-900 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow placeholder:text-text-secondary/60"
                      type="text"
                      value={profileData.idNumber}
                      onChange={(e) => setProfileData({ ...profileData, idNumber: e.target.value })}
                      required
                      placeholder="CC/TI/CE"
                    />
                  </label>
                  <label className="flex flex-col gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-text-main dark:text-gray-300">Correo Electrónico</span>
                    <input
                      className="w-full h-12 px-4 rounded-lg border border-border-color dark:border-slate-700 bg-background-light dark:bg-slate-900 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow placeholder:text-text-secondary/60"
                      type="email"
                      value={profileData.email}
                      readOnly // Email is usually not editable directly here
                      disabled
                    />
                  </label>
                  <div className="md:col-span-2 flex flex-col gap-3 items-center md:items-start">
                    <span className="text-sm font-medium text-text-main dark:text-gray-300">Foto de Perfil</span>
                    <label className="relative group w-24 h-24 rounded-full bg-background-light dark:bg-slate-800 border-2 border-dashed border-border-color dark:border-slate-600 flex items-center justify-center cursor-pointer overflow-hidden transition-all hover:border-primary">
                      {profileData.avatarUrl ? (
                        <img
                          src={profileData.avatarUrl}
                          alt="Avatar Preview"
                          className="absolute inset-0 w-full h-full object-cover opacity-100 group-hover:opacity-40 transition-opacity"
                        />
                      ) : (
                        <div className="absolute inset-0 w-full h-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                          {getInitials(profileData.firstName + ' ' + profileData.lastName)}
                        </div>
                      )}
                      <div className="z-10 flex flex-col items-center text-text-secondary group-hover:text-primary-dark transition-colors">
                        <span className="material-symbols-outlined">cloud_upload</span>
                        <span className="text-xs font-medium mt-1">Cambiar</span>
                      </div>
                      <input className="hidden" type="file" onChange={handleFileChange} accept="image/*" />
                    </label>
                  </div>
                </div>
              </div>
              <div className="fixed bottom-0 right-0 w-full lg:w-[calc(100%-18rem)] z-20 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-md border-t border-border-color dark:border-slate-800 p-4 md:px-12">
                <div className="max-w-[800px] mx-auto flex items-center justify-end gap-3">
                  <button
                    className="px-6 py-2.5 rounded-lg border border-border-color dark:border-slate-700 text-text-main dark:text-white font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    type="button"
                    onClick={fetchProfileData} // Revert changes
                    disabled={isSaving}
                  >
                    Cancelar
                  </button>
                  <button
                    className="px-6 py-2.5 rounded-lg bg-primary text-teal-950 font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/30 transform hover:-translate-y-0.5 transition-all"
                    type="submit"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default Profile;