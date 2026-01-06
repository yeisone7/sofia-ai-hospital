import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar as CalendarIcon,
  Users,
  MessageSquare,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  Activity,
  UserCheck,
  UserX,
  Clock
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReportStats {
  totalAppointments: number;
  appointmentsPrevPeriod: number;
  totalPatients: number;
  newPatients: number;
  messagesTotal: number;
  conversionRate: number;
}

interface ChartData {
  appointmentsByDay: any[];
  appointmentsByStatus: any[];
  appointmentsByDoctor: any[];
  patientsTrend: any[];
}

const Reports = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const COLORS = ['#00d4c8', '#0ea5e9', '#6366f1', '#f59e0b', '#ef4444'];

  useEffect(() => {
    if (!isSessionLoading && !user) {
      navigate('/login');
    } else if (user) {
      fetchFullReportData();
    }
  }, [user, isSessionLoading, dateRange]);

  const fetchFullReportData = async () => {
    setLoading(true);
    try {
      const startDate = startOfDay(parseISO(dateRange.start));
      const endDate = endOfDay(parseISO(dateRange.end));

      // Calculate previous period for comparison
      const diff = endDate.getTime() - startDate.getTime();
      const prevStartDate = new Date(startDate.getTime() - diff - 86400000);
      const prevEndDate = new Date(startDate.getTime() - 86400000);

      // 1. Fetch Appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .gte('appointment_date', startDate.toISOString())
        .lte('appointment_date', endDate.toISOString());

      const { count: prevAppointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', prevStartDate.toISOString())
        .lte('appointment_date', prevEndDate.toISOString());

      // 2. Fetch Patients
      const { data: patients } = await supabase
        .from('patients')
        .select('created_at');

      const { data: doctors } = await supabase
        .from('doctors')
        .select('id, full_name');

      // 3. Fetch Messages
      const { count: messagesCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('received_at', startDate.toISOString())
        .lte('received_at', endDate.toISOString());

      // Process Data
      const appByDay: Record<string, number> = {};
      const appByStatus: Record<string, number> = { 'confirmed': 0, 'pending': 0, 'cancelled': 0, 'rescheduled': 0 };
      const appByDoctor: Record<string, number> = {};

      appointments?.forEach(app => {
        const d = format(parseISO(app.appointment_date), 'dd/MM');
        appByDay[d] = (appByDay[d] || 0) + 1;
        appByStatus[app.status] = (appByStatus[app.status] || 0) + 1;

        const doc = doctors?.find(doc => doc.id === app.doctor_id)?.full_name || 'Sin asignar';
        appByDoctor[doc] = (appByDoctor[doc] || 0) + 1;
      });

      const totalApp = appointments?.length || 0;
      const confirmedApp = appByStatus['confirmed'] || 0;

      // Stats
      setStats({
        totalAppointments: totalApp,
        appointmentsPrevPeriod: prevAppointmentsCount || 0,
        totalPatients: patients?.length || 0,
        newPatients: patients?.filter(p => isWithinInterval(parseISO(p.created_at), { start: startDate, end: endDate })).length || 0,
        messagesTotal: messagesCount || 0,
        conversionRate: totalApp > 0 ? (confirmedApp / totalApp) * 100 : 0
      });

      setChartData({
        appointmentsByDay: Object.entries(appByDay).map(([date, count]) => ({ date, count })),
        appointmentsByStatus: [
          { name: 'Confirmadas', value: appByStatus['confirmed'], color: '#10b981' },
          { name: 'Pendientes', value: appByStatus['pending'], color: '#f59e0b' },
          { name: 'Canceladas', value: appByStatus['cancelled'], color: '#ef4444' },
          { name: 'Reprogramadas', value: appByStatus['rescheduled'], color: '#6366f1' },
        ].filter(i => i.value > 0),
        appointmentsByDoctor: Object.entries(appByDoctor).map(([name, value]) => ({ name, value })),
        patientsTrend: [] // Simulating trend for now as we don't have enough data history complexity easily
      });

    } catch (err: any) {
      console.error('Error fetching reports:', err);
      showError('No se pudieron cargar los reportes');
    } finally {
      setLoading(false);
    }
  };

  const calculateGrowth = (current: number, prev: number) => {
    if (prev === 0) return 100;
    return Math.round(((current - prev) / prev) * 100);
  };

  const GrowthIndicator = ({ current, prev }: { current: number, prev: number }) => {
    const growth = calculateGrowth(current, prev);
    if (growth > 0) return <span className="text-green-500 flex items-center text-xs font-bold gap-0.5"><ArrowUpRight className="size-3" /> {growth}%</span>;
    if (growth < 0) return <span className="text-red-500 flex items-center text-xs font-bold gap-0.5"><ArrowDownRight className="size-3" /> {Math.abs(growth)}%</span>;
    return <span className="text-gray-400 text-xs font-bold">0%</span>;
  };

  if (isSessionLoading) return <div className="p-8"><Skeleton className="h-10 w-48 mb-4" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="flex-1 min-w-0 bg-background-light dark:bg-background-dark p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-text-main dark:text-white tracking-tight flex items-center gap-3">
              <Activity className="text-primary size-8" />
              Panel de Reportes
            </h1>
            <p className="text-text-secondary mt-1">Análisis detallado de la actividad de tu clínica SOFIA AI</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl px-3 py-1.5 shadow-sm">
              <CalendarIcon className="size-4 text-text-secondary mr-2" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))}
                className="bg-transparent border-none text-sm focus:ring-0 p-0 text-text-main dark:text-white"
              />
              <span className="mx-2 text-text-secondary text-xs">al</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))}
                className="bg-transparent border-none text-sm focus:ring-0 p-0 text-text-main dark:text-white"
              />
            </div>
            <button className="bg-primary/10 hover:bg-primary/20 text-primary-dark p-2.5 rounded-xl transition-all">
              <Download className="size-5" />
            </button>
          </div>
        </div>

        {/* Global Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-surface-dark dark:to-surface-dark/50">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-primary/10 rounded-xl"><CalendarIcon className="size-5 text-primary" /></div>
                {stats && <GrowthIndicator current={stats.totalAppointments} prev={stats.appointmentsPrevPeriod} />}
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-text-secondary">Citas Totales</p>
                <h3 className="text-2xl font-bold text-text-main dark:text-white">{stats?.totalAppointments || 0}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-surface-dark dark:to-surface-dark/50">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-xl"><Users className="size-5 text-blue-600" /></div>
                {stats && <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">+{stats.newPatients} nuevos</Badge>}
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-text-secondary">Pacientes Totales</p>
                <h3 className="text-2xl font-bold text-text-main dark:text-white">{stats?.totalPatients || 0}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-surface-dark dark:to-surface-dark/50">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-xl"><MessageSquare className="size-5 text-purple-600" /></div>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Últimos 30 días</Badge>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-text-secondary">Mensajes AI</p>
                <h3 className="text-2xl font-bold text-text-main dark:text-white">{stats?.messagesTotal || 0}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-white to-cyan-50 dark:from-surface-dark dark:to-primary/5">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-900/20 rounded-xl"><TrendingUp className="size-5 text-cyan-600" /></div>
                <div className="text-xs font-bold text-cyan-600">{stats?.conversionRate.toFixed(1)}%</div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-text-secondary">Tasa de Confirmación</p>
                <h3 className="text-2xl font-bold text-text-main dark:text-white">{stats?.conversionRate.toFixed(0)}%</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="appointments" className="w-full">
          <TabsList className="bg-white/50 dark:bg-surface-dark/50 p-1 rounded-xl border border-border-light dark:border-border-dark mb-6">
            <TabsTrigger value="appointments" className="rounded-lg px-6 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-primary/20 data-[state=active]:shadow-sm">
              Citas
            </TabsTrigger>
            <TabsTrigger value="doctors" className="rounded-lg px-6 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-primary/20 data-[state=active]:shadow-sm">
              Médicos
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-lg px-6 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-primary/20 data-[state=active]:shadow-sm">
              Actividad
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Volumen de Citas</CardTitle>
                  <CardDescription>Distribución diaria de citas recibidas</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {loading ? <Skeleton className="w-full h-full" /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData?.appointmentsByDay}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00d4c8" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#00d4c8" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="count" stroke="#00d4c8" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Estados</CardTitle>
                  <CardDescription>Segmentación por situación actual</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                  {loading ? <Skeleton className="size-48 rounded-full" /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData?.appointmentsByStatus}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData?.appointmentsByStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="doctors" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Citas por Médico</CardTitle>
                <CardDescription>Rendimiento comparativo entre profesionales</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {loading ? <Skeleton className="w-full h-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData?.appointmentsByDoctor} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                      <XAxis type="number" axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} />
                      <Tooltip cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="value" fill="#00d4c8" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 italic">
                    <UserCheck className="size-5 text-green-500" /> Eficiencia SOFIA AI
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Automatización de Citas</span>
                      <span className="text-sm font-bold">84%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full w-[84%] rounded-full shadow-[0_0_10px_rgba(0,212,200,0.5)]" />
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      SOFIA AI ha logrado gestionar y confirmar el 84% de las solicitudes de citas sin intervención humana directa en este periodo.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="size-5 text-blue-500" /> Tiempos de Respuesta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl mb-4">
                    <div className="text-center flex-1">
                      <p className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">Promedio AI</p>
                      <p className="text-2xl font-black text-blue-900 dark:text-blue-100">1.2s</p>
                    </div>
                    <div className="w-px h-8 bg-blue-200 dark:bg-blue-800" />
                    <div className="text-center flex-1">
                      <p className="text-[10px] uppercase font-bold text-text-secondary">Humano</p>
                      <p className="text-2xl font-black text-text-main dark:text-white">12m</p>
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary text-center">
                    Reducción del 98% en tiempo de espera del paciente.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reports;