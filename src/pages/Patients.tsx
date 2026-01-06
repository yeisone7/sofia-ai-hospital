import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import PatientDialog from '@/components/patients/PatientDialog';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  address: string;
  created_at: string;
}

const Patients = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const navigate = useNavigate();

  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const patientsPerPage = 5;

  // Dialog State
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);


  useEffect(() => {
    if (!isSessionLoading && !user) {
      navigate('/login');
    } else if (user) {
      fetchPatientsData();
    }
  }, [user, isSessionLoading, navigate]);

  useEffect(() => {
    applyFiltersAndPagination();
  }, [allPatients, searchQuery, currentPage]);

  const fetchPatientsData = async () => {
    setPatientsLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user?.id) // Filter by current user's ID
        .order('last_name', { ascending: true });

      if (error) throw error;
      setAllPatients(data as Patient[]);

    } catch (error: any) {
      console.error('Error fetching patients data:', error);
      showError('Error al cargar los pacientes: ' + error.message);
    } finally {
      setPatientsLoading(false);
    }
  };

  const applyFiltersAndPagination = () => {
    let tempPatients = [...allPatients];

    if (searchQuery) {
      tempPatients = tempPatients.filter(patient =>
        patient.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.phone?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const startIndex = (currentPage - 1) * patientsPerPage;
    const endIndex = startIndex + patientsPerPage;
    setFilteredPatients(tempPatients.slice(startIndex, endIndex));
  };


  const handleAddPatient = () => {
    setSelectedPatient(null);
    setPatientDialogOpen(true);
  };

  const handleEditPatient = (patientId: string) => {
    const patient = allPatients.find(p => p.id === patientId);
    if (patient) {
      setSelectedPatient(patient);
      setPatientDialogOpen(true);
    }
  };

  const handlePatientSuccess = () => {
    fetchPatientsData();
  };

  const handleDeletePatient = async (patientId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar a este paciente?')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (error) throw error;

      showSuccess('Paciente eliminado correctamente.');
      fetchPatientsData(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting patient:', error);
      showError('Error al eliminar el paciente: ' + error.message);
    }
  };

  const totalPages = Math.ceil(allPatients.length / patientsPerPage);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const renderLoadingState = () => (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 mt-4 animate-pulse">
      {/* Action Bar Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="h-10 w-full md:max-w-md bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        <div className="flex items-center gap-3">
          <div className="h-11 w-28 bg-gray-200 dark:bg-gray-700 rounded-xl hidden md:block"></div>
          <div className="h-11 w-full sm:w-40 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        </div>
      </div>
      {/* Patients Table Skeleton */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-white/5">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16"></th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"></th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"></th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {[...Array(patientsPerPage)].map((_, i) => (
                <tr key={i} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="size-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="size-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                      <div className="size-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination Skeleton */}
        <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 mt-4">
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative group w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors">search</span>
          </div>
          <input className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-white dark:bg-surface-dark text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/50 shadow-sm text-sm transition-all" placeholder="Buscar por nombre, email o teléfono..." type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <button className="hidden md:flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-surface-dark text-slate-700 dark:text-slate-200 text-sm font-bold border border-transparent hover:border-border-light dark:hover:border-border-dark shadow-sm hover:shadow transition-all">
            <span className="material-symbols-outlined text-[20px]">filter_list</span>
            <span>Filtros</span>
          </button>
          <button onClick={handleAddPatient} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-teal-950 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all transform active:scale-95">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Agregar Paciente</span>
          </button>
        </div>
      </div>
      {/* Empty State Content */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-dashed border-border-light dark:border-border-dark p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-full mb-4">
          <span className="material-symbols-outlined text-slate-400 text-4xl">person_add</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No hay pacientes registrados</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-xs">Comienza agregando a tu primer paciente.</p>
        <button onClick={handleAddPatient} className="mt-5 text-primary font-bold hover:underline text-sm">Agregar Paciente ahora</button>
      </div>
    </div>
  );


  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark relative">
      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-10">
        {patientsLoading ? (
          renderLoadingState()
        ) : allPatients.length === 0 && !searchQuery ? (
          renderEmptyState()
        ) : (
          <div className="max-w-6xl mx-auto flex flex-col gap-6 mt-4">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative group w-full md:max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors">search</span>
                </div>
                <input
                  className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-white dark:bg-surface-dark text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/50 shadow-sm text-sm transition-all"
                  placeholder="Buscar por nombre, email o teléfono..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="flex items-center gap-3">
                <button className="hidden md:flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-surface-dark text-slate-700 dark:text-slate-200 text-sm font-bold border border-transparent hover:border-border-light dark:hover:border-border-dark shadow-sm hover:shadow transition-all">
                  <span className="material-symbols-outlined text-[20px]">filter_list</span>
                  <span>Filtros</span>
                </button>
                <button onClick={handleAddPatient} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-teal-950 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all transform active:scale-95">
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  <span>Agregar Paciente</span>
                </button>
              </div>
            </div>
            {/* Patients Table Card */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden flex flex-col">
              {/* Table Wrapper */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-white/5">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Nombre Completo
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Contacto
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Fecha de Nacimiento
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {filteredPatients.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-text-secondary">
                          No se encontraron pacientes que coincidan con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredPatients.map((patient) => (
                        <tr key={patient.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">{patient.first_name} {patient.last_name}</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">ID: {patient.id.substring(0, 8)}...</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm text-slate-700 dark:text-white">{patient.email}</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">{patient.phone}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-slate-700 dark:text-white">{patient.date_of_birth}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEditPatient(patient.id)} className="p-2 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Editar">
                                <span className="material-symbols-outlined text-[20px]">edit</span>
                              </button>
                              <button onClick={() => handleDeletePatient(patient.id)} className="p-2 text-slate-500 hover:text-red-500 hover:bg-hover-red-light-bg dark:hover:bg-hover-red-dark-bg rounded-lg transition-colors" title="Eliminar">
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Mostrando <span className="font-bold text-slate-900 dark:text-white">{(currentPage - 1) * patientsPerPage + 1}-{Math.min(currentPage * patientsPerPage, allPatients.length)}</span> de <span className="font-bold text-slate-900 dark:text-white">{allPatients.length}</span> resultados
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm text-slate-500 bg-white dark:bg-white/10 border border-border-light dark:border-transparent rounded-lg hover:bg-slate-50 dark:hover:bg-white/20 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm text-slate-500 bg-white dark:bg-white/10 border border-border-light dark:border-transparent rounded-lg hover:bg-slate-50 dark:hover:bg-white/20 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <PatientDialog
        open={patientDialogOpen}
        onOpenChange={setPatientDialogOpen}
        patient={selectedPatient}
        onSuccess={handlePatientSuccess}
      />
    </div>
  );
};

export default Patients;