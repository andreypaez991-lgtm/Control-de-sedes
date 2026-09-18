import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Building2,
  FileSpreadsheet,
  Plus,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  Download,
  AlertCircle,
  Shield,
  Search,
  Filter,
} from 'lucide-react';
import { Sede, Report } from '../types';
import { storage } from '../lib/storage';
import { ReportDetailsModal } from '../components/ReportDetailsModal';

interface AdminScreenProps {
  onBack: () => void;
  isOnline: boolean;
}

export const AdminScreen: React.FC<AdminScreenProps> = ({ onBack, isOnline }) => {
  const [activeTab, setActiveTab] = useState<'sedes' | 'reports'>('sedes');
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  // Sede creation form
  const [newSedeName, setNewSedeName] = useState('');
  const [newManipuladoraName, setNewManipuladoraName] = useState('');
  const [sedeToDelete, setSedeToDelete] = useState<Sede | null>(null);

  // Reports filters
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SYNCED' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectedReport, setInspectedReport] = useState<Report | null>(null);

  // Syncing state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const loadData = () => {
    const rawSedes = storage.getSedes();
    setSedes(Array.from(new Map(rawSedes.map((s) => [s.id, s])).values()));
    const rawReports = storage.getReports();
    setReports(Array.from(new Map(rawReports.map((r) => [r.id, r])).values()));
  };

  useEffect(() => {
    loadData();

    const handleDataChange = () => {
      loadData();
    };

    window.addEventListener('arthemah:data-updated', handleDataChange);
    return () => window.removeEventListener('arthemah:data-updated', handleDataChange);
  }, []);

  const handleSyncAllNow = async () => {
    if (!isOnline) {
      setSyncFeedback('Dispositivo sin internet. La sincronización se ejecutará cuando haya señal.');
      setTimeout(() => setSyncFeedback(null), 4000);
      return;
    }

    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await storage.syncAllPending();
      loadData();
      setSyncFeedback(`Sincronización finalizada: ${res.syncedCount} reportes actualizados.`);
    } catch {
      setSyncFeedback('Error al sincronizar con el servidor.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  // Sede operations
  const handleCreateSede = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSedeName.trim() || !newManipuladoraName.trim()) return;

    await storage.addSede(newSedeName, newManipuladoraName);
    setNewSedeName('');
    setNewManipuladoraName('');
    loadData();
  };

  const handleToggleSede = async (id: number) => {
    await storage.toggleSedeStatus(id);
    loadData();
  };

  const handleConfirmDeleteSede = async () => {
    if (!sedeToDelete) return;
    await storage.deleteSede(sedeToDelete.id);
    setSedeToDelete(null);
    loadData();
  };

  // Export reports to CSV/Excel
  const handleExportCSV = () => {
    if (reports.length === 0) {
      alert('No hay reportes para exportar.');
      return;
    }

    const headers = [
      'ID Reporte',
      'Fecha',
      'Sede',
      'Manipuladora',
      'Desayunos',
      'Almuerzos',
      'Refrigerios',
      'Faltantes',
      'Filtro Aplicado',
      'Estado Sincronizacion',
      'Notas / Observaciones',
    ];

    const rows = reports.map((r) => [
      r.id,
      new Date(r.createdAt).toISOString(),
      `"${r.sedeName.replace(/"/g, '""')}"`,
      `"${r.manipuladoraName.replace(/"/g, '""')}"`,
      r.rations?.desayunos ?? 0,
      r.rations?.almuerzos ?? 0,
      r.rations?.refrigerios ?? 0,
      r.rations?.faltantes ?? 0,
      r.filterApplied,
      r.syncStatus,
      `"${(r.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Reportes_PAE_Arthemah_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filtered reports
  const filteredReports = reports.filter((rep) => {
    if (filterStatus === 'SYNCED' && rep.syncStatus !== 'SYNCED') return false;
    if (filterStatus === 'PENDING' && rep.syncStatus !== 'PENDING') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSede = rep.sedeName.toLowerCase().includes(q);
      const matchManip = rep.manipuladoraName.toLowerCase().includes(q);
      const matchNotes = (rep.notes || '').toLowerCase().includes(q);
      if (!matchSede && !matchManip && !matchNotes) return false;
    }
    return true;
  });

  // Metrics calculation
  const totalReports = reports.length;
  const syncedCount = reports.filter((r) => r.syncStatus === 'SYNCED').length;
  const pendingCount = reports.filter((r) => r.syncStatus === 'PENDING').length;

  return (
    <div className="flex-1 pb-16">
      {/* Top Bar */}
      <div className="bg-[#0F3863] text-white shadow-md sticky top-[57px] sm:top-[65px] z-30 border-b border-[#0A2342]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white hover:text-[#CCFBF1] p-1.5 rounded-lg hover:bg-white/10 transition"
              title="Volver"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>
            <div className="h-4 w-px bg-white/30 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <Shield className="w-5 h-5 text-[#CCFBF1]" />
              <h2 className="text-sm sm:text-base font-bold tracking-tight">Panel Administrador</h2>
            </div>
          </div>

          <button
            id="sync-all-now-btn"
            onClick={handleSyncAllNow}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-[12px] bg-[#0D9488] hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">🔄 Sincronizar Todo Ahora</span>
            <span className="sm:hidden">Sincronizar</span>
          </button>
        </div>
      </div>

      {syncFeedback && (
        <div className="bg-amber-500 text-white text-xs font-semibold py-2 px-4 text-center animate-in fade-in">
          {syncFeedback}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-6">
        {/* Firebase & Arthemah AI Status Overview Card */}
        <div className="mb-6 bg-gradient-to-r from-[#0F3863] via-[#0A2540] to-[#0D9488] text-white rounded-[18px] p-4 sm:p-5 shadow-sm border border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#CCFBF1] text-[#0F3863]">
                  🔥 Firebase Firestore Conectado
                </span>
                <span className="text-xs text-white/80 font-mono">Proyecto: miapp-app</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold">
                Motor PAE - Sincronización en Tiempo Real & Arthemah IA
              </h3>
              <p className="text-xs text-white/80 leading-relaxed max-w-2xl">
                Base de datos Firestore sincronizando sedes, reportes y transcripciones automáticas de planillas físicas procesadas por el motor de visión inteligente.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-white/10 backdrop-blur-xs px-3 py-2 rounded-xl text-center border border-white/20">
                <span className="block text-[10px] uppercase font-bold text-[#CCFBF1]">Firebase</span>
                <span className="text-sm font-bold">{syncedCount} sincronizados</span>
              </div>
              {pendingCount > 0 && (
                <div className="bg-orange-500/20 px-3 py-2 rounded-xl text-center border border-orange-400/40">
                  <span className="block text-[10px] uppercase font-bold text-orange-200">En Cola</span>
                  <span className="text-sm font-bold text-orange-200">{pendingCount} pendientes</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Two Main Tabs: "Gestión de Sedes" and "Reportes y Auditoría" */}
        <div className="flex border-b border-[#E2E8F0] mb-6 bg-white rounded-[14px] p-1.5 shadow-xs border">
          <button
            id="tab-sedes"
            onClick={() => setActiveTab('sedes')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[10px] text-xs sm:text-sm font-bold transition ${
              activeTab === 'sedes'
                ? 'bg-[#0F3863] text-white shadow-sm'
                : 'text-[#475569] hover:text-[#0F3863] hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Pestaña 1: Gestión de Sedes</span>
          </button>

          <button
            id="tab-reports"
            onClick={() => setActiveTab('reports')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[10px] text-xs sm:text-sm font-bold transition ${
              activeTab === 'reports'
                ? 'bg-[#0F3863] text-white shadow-sm'
                : 'text-[#475569] hover:text-[#0F3863] hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Pestaña 2: Reportes y Auditoría</span>
          </button>
        </div>

        {/* TAB 1: GESTIÓN DE SEDES */}
        {activeTab === 'sedes' && (
          <div className="space-y-6">
            {/* Formulario para crear sede */}
            <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-sm p-4 sm:p-6">
              <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0] mb-4">
                <Plus className="w-5 h-5 text-[#0D9488]" />
                <h3 className="font-bold text-sm sm:text-base text-[#0A2342]">
                  Registrar Nueva Sede Escolar
                </h3>
              </div>

              <form onSubmit={handleCreateSede} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F3863] uppercase tracking-wider mb-1.5">
                    Nombre de Sede:
                  </label>
                  <input
                    id="new-sede-name"
                    type="text"
                    required
                    value={newSedeName}
                    onChange={(e) => setNewSedeName(e.target.value)}
                    placeholder="Ej: Sede Escuela La Pradera"
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-[12px] border-2 border-[#E2E8F0] text-sm focus:border-[#2563EB] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F3863] uppercase tracking-wider mb-1.5">
                    Nombre de Manipuladora:
                  </label>
                  <input
                    id="new-manipuladora-name"
                    type="text"
                    required
                    value={newManipuladoraName}
                    onChange={(e) => setNewManipuladoraName(e.target.value)}
                    placeholder="Ej: María Fernanda Torres"
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-[12px] border-2 border-[#E2E8F0] text-sm focus:border-[#2563EB] focus:outline-hidden"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    id="create-sede-btn"
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 min-h-[46px] px-4 py-2.5 rounded-[12px] bg-[#0F3863] text-white font-bold text-sm hover:bg-[#0A2342] active:scale-98 transition shadow-sm"
                  >
                    <Plus className="w-4 h-4 text-[#CCFBF1]" />
                    <span>+ Crear Sede</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Lista de sedes registradas */}
            <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
                <h3 className="font-bold text-sm sm:text-base text-[#0A2342]">
                  Sedes Registradas en Sistema ({sedes.length})
                </h3>
                <span className="text-xs text-[#475569]">
                  {sedes.filter((s) => s.isActive).length} Activas
                </span>
              </div>

              <div className="space-y-3">
                {sedes.map((sede, idx) => (
                  <div
                    key={`admin-sede-${sede.id}-${idx}`}
                    className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          sede.isActive ? 'bg-[#0F3863] text-white' : 'bg-slate-300 text-slate-600'
                        }`}
                      >
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-[#0F172A]">{sede.name}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              sede.isActive
                                ? 'bg-[#DCFCE7] text-[#16A34A]'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {sede.isActive ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                        <p className="text-xs text-[#475569] mt-0.5">
                          Manipuladora Asignada: <strong>{sede.manipuladoraName}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Switch and Delete Button */}
                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#475569]">
                        <span>{sede.isActive ? 'Habilitada' : 'Deshabilitada'}</span>
                        <input
                          type="checkbox"
                          checked={sede.isActive}
                          onChange={() => handleToggleSede(sede.id)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0D9488] relative"></div>
                      </label>

                      <button
                        onClick={() => setSedeToDelete(sede)}
                        className="p-2 text-slate-400 hover:text-[#DC2626] rounded-lg hover:bg-red-50 transition"
                        title="Eliminar sede"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REPORTES Y AUDITORÍA */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Tarjetas de resumen con métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
                <span className="text-xs font-bold text-[#475569] uppercase tracking-wider block">
                  Total Reportes Recibidos
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl sm:text-3xl font-black text-[#0F3863]">
                    {totalReports}
                  </span>
                  <span className="text-xs text-[#475569]">históricos</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-sm bg-gradient-to-br from-white to-emerald-50/40">
                <span className="text-xs font-bold text-[#16A34A] uppercase tracking-wider block flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Sincronizados en Nube
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl sm:text-3xl font-black text-[#16A34A]">
                    {syncedCount}
                  </span>
                  <span className="text-xs text-emerald-700">en base de datos</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-orange-200 p-4 shadow-sm bg-gradient-to-br from-white to-orange-50/40">
                <span className="text-xs font-bold text-[#EA580C] uppercase tracking-wider block flex items-center gap-1">
                  <Clock className="w-4 h-4" /> Pendientes de Subida
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl sm:text-3xl font-black text-[#EA580C]">
                    {pendingCount}
                  </span>
                  <span className="text-xs text-orange-700">en almacenamiento local</span>
                </div>
              </div>
            </div>

            {/* Filtros por estado y Buscador & Exportación */}
            <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-sm p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Filtros por estado: "Todos", "🟢 Sincronizados", "🟠 Pendientes" */}
                <div className="flex items-center gap-1.5 bg-[#F1F5F9] p-1 rounded-xl">
                  <button
                    onClick={() => setFilterStatus('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      filterStatus === 'ALL'
                        ? 'bg-[#0F3863] text-white shadow-xs'
                        : 'text-[#475569] hover:text-[#0F172A]'
                    }`}
                  >
                    Todos ({totalReports})
                  </button>
                  <button
                    onClick={() => setFilterStatus('SYNCED')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      filterStatus === 'SYNCED'
                        ? 'bg-[#16A34A] text-white shadow-xs'
                        : 'text-[#475569] hover:text-[#0F172A]'
                    }`}
                  >
                    🟢 Sincronizados ({syncedCount})
                  </button>
                  <button
                    onClick={() => setFilterStatus('PENDING')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      filterStatus === 'PENDING'
                        ? 'bg-[#EA580C] text-white shadow-xs'
                        : 'text-[#475569] hover:text-[#0F172A]'
                    }`}
                  >
                    🟠 Pendientes ({pendingCount})
                  </button>
                </div>

                {/* Exportar a Excel / CSV */}
                <button
                  id="export-csv-btn"
                  onClick={handleExportCSV}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-[12px] bg-[#0D9488] text-white font-bold text-xs hover:bg-teal-700 transition shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar a Excel / CSV</span>
                </button>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por sede, manipuladora u observaciones..."
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-[10px] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>
            </div>

            {/* Listado de reportes */}
            <div className="space-y-3">
              {filteredReports.length > 0 ? (
                filteredReports.map((report, idx) => {
                  const dateStr = new Date(report.createdAt).toLocaleString('es-CO', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  });

                  return (
                    <div
                      key={`admin-rep-${report.id}-${idx}`}
                      className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs hover:border-[#2563EB]/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {report.photoBase64 ? (
                          <div
                            onClick={() => setInspectedReport(report)}
                            className="w-14 h-14 rounded-lg bg-neutral-950 overflow-hidden shrink-0 border border-slate-300 cursor-pointer hover:opacity-85 relative group"
                            title="Ampliar para auditar firmas"
                          >
                            <img
                              src={report.photoBase64}
                              alt="Foto escaneada"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-[#0F3863]">
                            <FileSpreadsheet className="w-5 h-5" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-sm text-[#0F172A] truncate">
                              {report.sedeName}
                            </span>
                            <span className="text-xs text-[#475569]">• {dateStr}</span>

                            {report.syncStatus === 'SYNCED' ? (
                              <span className="text-[10px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                                🟢 Sincronizado
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-[#EA580C] bg-orange-100 px-2 py-0.5 rounded-full">
                                🟠 Pendiente
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-[#475569]">
                            Manipuladora: <strong>{report.manipuladoraName}</strong>
                          </p>
                          <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                            {report.notes}
                          </p>
                        </div>
                      </div>

                      <div className="self-end sm:self-center shrink-0">
                        <button
                          onClick={() => setInspectedReport(report)}
                          className="flex items-center gap-1 text-xs font-bold text-[#0F3863] hover:text-blue-700 bg-[#F1F5F9] hover:bg-slate-200 px-3 py-2 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Auditar Planilla</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-white p-8 rounded-xl border border-dashed border-[#CBD5E1] text-center text-xs text-[#475569]">
                  No se encontraron reportes con los filtros seleccionados.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Sede Confirmation Modal */}
      {sedeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-red-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-[#DC2626] flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A] text-center">
              ¿Eliminar Sede Educativa?
            </h3>
            <p className="text-xs text-[#475569] text-center mt-1">
              Estás a punto de eliminar <strong>"{sedeToDelete.name}"</strong>. Esta acción no se puede deshacer.
            </p>

            <div className="flex items-center gap-2.5 mt-5">
              <button
                onClick={() => setSedeToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-[#475569] hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteSede}
                className="flex-1 py-2.5 rounded-xl bg-[#DC2626] text-white text-xs font-bold hover:bg-red-700"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Report Inspection Modal */}
      <ReportDetailsModal
        report={inspectedReport}
        onClose={() => setInspectedReport(null)}
      />
    </div>
  );
};
