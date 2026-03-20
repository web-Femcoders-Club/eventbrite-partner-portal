/// <reference types="vite/client" />
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import './index.css';

interface Attendee {
  firstName: string;
  lastName: string;
  dni: string;
  isIncomplete: boolean;
  email: string;
  ticketCount: number;
  pendingCount: number;
  isFullyPending: boolean;
  orderFirstName?: string;
  orderLastName?: string;
  orderEmail?: string;
  guests?: string[];
  isGuestOf?: string;
  alerts: {
    isInfoRequested: boolean;
    dniMissing: boolean;
    dniInvalid: boolean;
    hasMultipleEntries: boolean;
  }
}

interface EventData {
  event: string;
  partner: string;
  totalRegistrations: number;
  uniqueAttendees: number;
  summary: {
    sinIdentificacion: number;
    conAcompanantes: number;
  };
  registrations: Attendee[];
  fullDataEnabled: boolean;
  message: string;
}

const App: React.FC = () => {
  const [data, setData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentView, setCurrentView] = useState<'dashboard' | 'admin'>('dashboard');
  const [testEmail, setTestEmail] = useState('');
  const [previewList, setPreviewList] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [templateHtml, setTemplateHtml] = useState('');
  
  // Gestión de Acceso
  const [apiKey, setApiKey] = useState<string | null>(localStorage.getItem('portal_token'));
  const [inputKey, setInputKey] = useState('');

  // En producción (Railway) usamos el mismo servidor, en local apuntamos al puerto 3001
  const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
  const API_URL = `${API_BASE}/api/partners/active-event`;
  
  // FemCoders (Admin) siempre tiene acceso a todo.
  const isFemCoders = data?.partner?.toLowerCase().includes('femcoders') || data?.partner?.toLowerCase().includes('admin');

  // InfoJobs solo puede exportar el día del evento (26 de Marzo).
  const isExportWindowOpen = () => {
    const today = new Date();
    // 26 de Marzo de 2026 (JS: 2026, 2, 26)
    return today.getFullYear() === 2026 && 
           today.getMonth() === 2 && 
           today.getDate() === 26;
  };

  const canExport = isFemCoders || isExportWindowOpen();

  const fetchRegistrations = async () => {
    if (!apiKey) return;
    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        headers: {
          'x-api-key': apiKey
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cargar los datos');
      }
      
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiKey) {
      fetchRegistrations();
    }
  }, [apiKey]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim()) {
      localStorage.setItem('portal_token', inputKey.trim());
      setApiKey(inputKey.trim());
      setError(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('portal_token');
    setApiKey(null);
    setData(null);
    setCurrentView('dashboard');
  };


  const handleSyncBrevo = async () => {
    if (!apiKey || !isFemCoders) return;
    const confirmSync = window.confirm('¿Quieres sincronizar los nuevos asistentes con Brevo y enviar los avisos automáticamente?');
    if (!confirmSync) return;

    try {
      const resp = await fetch(`${API_BASE}/api/admin/sync-brevo`, {
        method: 'POST',
        headers: { 'x-api-key': apiKey }
      });
      const result = await resp.json();
      if (resp.ok) {
        alert(result.message || 'Sincronización completada con éxito.');
        fetchRegistrations(); // Recargamos para actualizar flags si los mostramos
      } else {
        alert(result.error || 'Error en la sincronización.');
      }
    } catch (err) {
      alert('Error de conexión con el servidor de Brevo');
    }
  };


  const handleFetchPreview = async () => {
    if (!apiKey || !isFemCoders) return;
    setLoading(true);
    try {
      // 1. Primero sincronizamos con Brevo para que el panel refleje lo real
      await fetch(`${API_BASE}/api/admin/sync-brevo-status`, {
        headers: { 'x-api-key': apiKey }
      });

      // 2. Luego cargamos la lista ya actualizada
      const resp = await fetch(`${API_BASE}/api/admin/sync-preview`, {
        headers: { 'x-api-key': apiKey }
      });
      const result = await resp.json();
      if (resp.ok) {
        setPreviewList(result.previewList);
        setShowPreview(true);
      } else {
        alert(result.error || 'Error al cargar vista previa');
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleShowTemplate = async (type: 'dni' | 'multiple' = 'dni') => {
    if (!apiKey || !isFemCoders) return;
    try {
      const resp = await fetch(`${API_BASE}/api/admin/email-template-preview?type=${type}`, {
        headers: { 'x-api-key': apiKey }
      });
      if (resp.ok) {
        const html = await resp.text();
        setTemplateHtml(html);
        setShowTemplatePreview(true);
      }
    } catch (err) {
      alert('Error cargando plantilla');
    }
  };

  const handleSendTestEmail = async (type: 'dni' | 'multiple' = 'dni') => {
    if (!apiKey || !isFemCoders) return;
    if (!testEmail) {
      alert('Por favor, indica un email de destino.');
      return;
    }
    
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/admin/send-test-email`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': apiKey 
        },
        body: JSON.stringify({ testEmail, type })
      });
      const result = await resp.json();
      if (resp.ok) {
        alert('✅ ¡Email enviado! Revisa tu bandeja de entrada (y la carpeta de spam).');
      } else {
        alert(`❌ Error: ${result.error || 'No se pudo enviar el email'}`);
      }
    } catch (err) {
      alert('❌ Error de conexión al intentar enviar el correo de prueba.');
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyAttendee = async (email: string, type: string) => {
    if (!apiKey || !isFemCoders) return;
    
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/admin/notify-attendee`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': apiKey 
        },
        body: JSON.stringify({ email, type })
      });
      const result = await resp.json();
      if (resp.ok) {
        setPreviewList(prev => prev.map(p => 
          p.email === email ? { ...p, isNotified: true, notifiedAt: new Date().toISOString() } : p
        ));
        alert('✅ Notificación enviada correctamente.');
      } else {
        alert(`❌ Error: ${result.error || 'No se pudo enviar la notificación'}`);
      }
    } catch (err) {
      alert('❌ Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const filteredAttendees = data?.registrations.filter(a => {
    const searchLower = searchTerm.toLowerCase();
    
    const fullName = `${a.firstName} ${a.lastName}`.toLowerCase();
    const emailMatch = (a.email || '').toLowerCase().includes(searchLower) || 
                       (a.orderEmail || '').toLowerCase().includes(searchLower);
    
    const guestsMatch = a.guests?.some(g => g.toLowerCase().includes(searchLower));

    return fullName.includes(searchLower) || 
           emailMatch || 
           guestsMatch;
  }) || [];

  // Paginación
  const totalPages = Math.ceil(filteredAttendees.length / itemsPerPage);
  const paginatedAttendees = filteredAttendees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const maskDni = (dni: string) => {
    if (!dni || dni.length < 5) return '***';
    return `${dni.substring(0, 3)}***${dni.substring(dni.length - 2)}`;
  };

  const handleExportCSV = () => {
    if (!data || !canExport) return;
    const csvHeader = 'Nombre,Apellidos,Email,DNI,Acompañantes,Estado\n';
    const csvRows = filteredAttendees.map(a => {
      const email = a.orderEmail || a.email || '';
      const dni = a.dni || (a.alerts.isInfoRequested ? 'PENDIENTE' : 'N/A');
      const guests = a.guests ? a.guests.join(' | ') : '';
      const status = (a.isIncomplete || a.alerts.dniInvalid) ? 'Incompleto' : 'Validado';
      const cleanFName = (a.firstName || '').replace(/,/g, '');
      const cleanLName = (a.lastName || '').replace(/,/g, '');
      return `"${cleanFName}","${cleanLName}","${email}","${dni}","${guests}","${status}"`;
    }).join('\n');
    
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const eventTitle = "Estructuras en Movimiento: mujeres que transforman el futuro";
    const link = document.createElement("a");
    link.href = url;
    link.download = `asistentes_${eventTitle.replace(/[: ]/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    if (!data || !canExport) return;
    const worksheet = XLSX.utils.json_to_sheet(filteredAttendees.map(a => ({
      Nombre: a.firstName || '',
      Apellidos: a.lastName || '',
      Email: a.orderEmail || a.email || '',
      'DNI / ID': a.dni || (a.alerts.isInfoRequested ? 'PENDIENTE' : 'N/A'),
      Estado: (a.isIncomplete || a.alerts.dniInvalid) ? 'Incompleto' : 'Validado',
      Entradas: a.ticketCount,
      Acompañantes: a.guests ? a.guests.join(', ') : ''
    })));
    const eventTitle = "Estructuras en Movimiento: mujeres que transforman el futuro";
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Asistentes");
    XLSX.writeFile(workbook, `asistentes_${eventTitle.replace(/[: ]/g, '_')}.xlsx`);
  };

  const handleExportPDF = () => {
    if (!data || !canExport) return;

    const cleanForPDF = (str: string) => {
      if (!str) return '';
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' }) as any;
    
    const tableColumn = ["#", "Titular / Comprador", "Acompañantes", "Email", "DNI / ID", "Entradas", "Estado"];
    const tableRows = filteredAttendees.map((a, i) => [
      i + 1,
      cleanForPDF(`${a.firstName} ${a.lastName}`),
      a.guests ? cleanForPDF(a.guests.join(', ')) : '',
      a.orderEmail || a.email,
      a.dni || (a.alerts.isInfoRequested ? 'PENDIENTE' : 'N/A'),
      a.ticketCount,
      (a.isIncomplete || a.alerts.dniInvalid) ? 'Incompleto' : 'Validado'
    ]);

    const eventTitle = "Estructuras en Movimiento: mujeres que transforman el futuro";
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(71, 55, 187); 
    doc.text(`FemCoders Club - Listado de Asistentes`, 14, 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Evento: ${eventTitle}`, 14, 22);
    doc.text(`Exportado: ${new Date().toLocaleDateString()}`, 14, 27);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3, font: 'helvetica', valign: 'middle', overflow: 'linebreak' },
      headStyles: { fillColor: [71, 55, 187], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 50 },
        2: { cellWidth: 50 },
        3: { cellWidth: 65 },
        4: { cellWidth: 30, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 25, halign: 'center' }
      }
    });
    
    doc.save(`asistentes_${eventTitle.replace(/[: ]/g, '_')}.pdf`);
  };

  if (loading) return <div className="loading-state">Cargando portal seguro...</div>;
  if (error) return (
    <div className="error-container">
      <div className="error-card">
        <div className="error-icon">⚠️</div>
        <h2>Aviso del Sistema</h2>
        <p>{error}</p>
        <div className="error-actions">
          <button onClick={handleLogout} className="btn-secondary">Reintentar / Cambiar Código</button>
          <a href="mailto:irina.ichim@femcodersclub.com" className="btn-primary">Soporte Técnico</a>
        </div>
      </div>
    </div>
  );

  if (!apiKey) {
    return (
      <LoginView 
        inputKey={inputKey}
        setInputKey={setInputKey}
        handleLogin={handleLogin}
        loading={loading}
        error={error}
      />
    );
  }

  return (
    <div className="dashboard-container">
      <header className="main-header">
        <div className="header-content">
          <div className="header-left">
            <div className="logos-group">
              <img src="/logo-femcoders.jpg" alt="FemCoders Club" className="brand-logo" />
              <div className="divider"></div>
              <img src="/logo-infojobs.jpg" alt="Partner Logo" className="partner-logo" />
            </div>
          </div>

          {isFemCoders && (
            <div className="header-center">
              <nav className="premium-nav">
                <button 
                  className={`nav-pill ${currentView === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setCurrentView('dashboard')}
                >
                  <span className="pill-icon">📊</span>
                  <span className="pill-text">Panel Partner</span>
                </button>
                <button 
                  className={`nav-pill ${currentView === 'admin' ? 'active' : ''}`}
                  onClick={() => setCurrentView('admin')}
                >
                  <span className="pill-icon">🛠️</span>
                  <span className="pill-text">Admin Tools</span>
                </button>
              </nav>
            </div>
          )}

          <div className="header-right">
            <div className="user-profile-widget shadow-sm">
              <div className="user-meta">
                <span className="user-status-dot"></span>
                <span className="user-role-label">Partner Access</span>
                <span className="user-name">{data?.partner}</span>
              </div>
              <button onClick={handleLogout} className="btn-logout-premium" title="Cerrar sesión">
                <span className="logout-icon">🚪</span>
                <span className="logout-text">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {isFemCoders && currentView === 'admin' ? (
          <section className="admin-vault">
            <div className="admin-header">
              <span className="vault-icon">🔐</span>
              <div>
                <h2>FemCoders Admin Vault</h2>
                <p>Herramientas exclusivas para la gestión del club (Brevo, Exportaciones, etc).</p>
              </div>
            </div>
            <div className="admin-actions">
              <div className="admin-tool-card highlighted">
                <div className="tool-icon">📋</div>
                <h3>Lista de Notificaciones</h3>
                <p>Consulta quién tiene el DNI incompleto o múltiples entradas antes de tomar cualquier acción.</p>
                <button onClick={handleFetchPreview} className="btn-admin-premium">
                  🔍 Ver Personas a Notificar
                </button>
              </div>

              <div className="admin-tool-card">
                <div className="tool-icon">🎨</div>
                <h3>Diseño de Correos</h3>
                <p>Revisa cómo se ven los avisos corporativos (logo, colores y textos) antes de que lleguen a los usuarios.</p>
                <div className="template-btn-group">
                  <button onClick={() => handleShowTemplate('dni')} className="btn-admin-premium secondary btn-sm">
                    Ver Aviso DNI
                  </button>
                  <button onClick={() => handleShowTemplate('multiple')} className="btn-admin-premium secondary btn-sm">
                    Ver Aviso Multi.
                  </button>
                </div>
              </div>

              <div className="admin-tool-card">
                <div className="tool-icon">📧</div>
                <h3>Enviar Correo de Prueba</h3>
                <p>Envía un correo real a tu bandeja para verificar que todo llega correctamente.</p>
                <div className="test-input-group">
                  <input 
                    type="email" 
                    placeholder="Tu email..." 
                    className="input-premium"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                </div>
                <div className="template-btn-group">
                  <button onClick={() => handleSendTestEmail('dni')} className="btn-admin-premium secondary btn-sm" disabled={loading}>
                    Test DNI
                  </button>
                  <button onClick={() => handleSendTestEmail('multiple')} className="btn-admin-premium secondary btn-sm" disabled={loading}>
                    Test Multi.
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="welcome-banner">
              <div className="banner-text">
                <h1>Panel de Control {data?.partner}</h1>
                <p>Estado de salud de las inscripciones y cumplimiento normativo.</p>
              </div>
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-value highlight">{data?.totalRegistrations}</span>
                  <span className="stat-label">Entradas Totales</span>
                </div>
                {data?.summary && (data.summary.sinIdentificacion > 0 || data.summary.conAcompanantes > 0) && (
                  <div className="alert-panel shadow-soft">
                    <h3>🔔 Incidencias detectadas</h3>
                    <div className="alert-items">
                      {data.summary.sinIdentificacion > 0 && (
                        <span>Sin identificación válida: <strong>{data.summary.sinIdentificacion}</strong></span>
                      )}
                      {data.summary.conAcompanantes > 0 && (
                        <span>Con acompañantes: <strong>{data.summary.conAcompanantes}</strong></span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="data-section">
              <div className="section-header">
                <div className="title-area">
                  <h2>Listado de Asistentes</h2>
                  <div className="sync-badge">
                    <span className="live-dot"></span>
                    <span>En vivo</span>
                    <button onClick={() => fetchRegistrations()} className="btn-refresh" disabled={loading} title="Sincronizar">
                      {loading ? '...' : '🔄'}
                    </button>
                  </div>
                </div>
                <div className="table-controls">
                  <div className="export-tools">
                    <button onClick={handleExportCSV} className="btn-export csv" disabled={!canExport}>CSV</button>
                    <button onClick={handleExportExcel} className="btn-export excel" disabled={!canExport}>Excel</button>
                    <button onClick={handleExportPDF} className="btn-export pdf" disabled={!canExport}>PDF</button>
                  </div>
                  {!canExport && <div className="export-lock-notice">🔒 Exportación disponible solo el 26 de marzo</div>}
                  <div className="rows-selector">
                    <span>Mostrar:</span>
                    <select 
                      value={itemsPerPage} 
                      onChange={(e) => {setItemsPerPage(Number(e.target.value)); setCurrentPage(1);}}
                      title="Registros por página"
                      aria-label="Registros por página"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <div className="search-box">
                    <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="table-container shadow-soft">
                <table>
                  <thead>
                    <tr>
                      <th className="index-header">#</th>
                      <th>Asistente</th>
                      <th>DNI / Identificación</th>
                      <th>Alertas</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAttendees.length > 0 ? (
                      paginatedAttendees.map((attendee, index) => {
                        const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                        const rowStatus = (attendee.isIncomplete || attendee.alerts.dniInvalid) ? 'row-incomplete' : '';
                        return (
                          <tr key={index} className={rowStatus}>
                            <td className="index-cell">{globalIndex}</td>
                            <td>
                            <div className="main-identity">
                                <strong>{attendee.firstName} {attendee.lastName}</strong>
                                {attendee.ticketCount > 1 && (
                                  <span className="ticket-count-simple">x{attendee.ticketCount}</span>
                                )}
                            </div>
                            {attendee.guests && attendee.guests.length > 0 && <div className="guest-names">👥 + {attendee.guests.join(', ')}</div>}
                            <small className="full-email">{attendee.orderEmail || attendee.email}</small>
                            </td>
                            <td className="dni-cell">
                              <span className={attendee.alerts.dniInvalid ? 'text-warning' : ''}>
                                {attendee.isIncomplete ? 'No proporcionado' : maskDni(attendee.dni)}
                              </span>
                              {attendee.alerts.dniInvalid && <span className="label-warning">Invalido</span>}
                            </td>
                            <td>
                              <div className="alerts-group">
                                {attendee.ticketCount > 1 && <span>👥</span>}
                                {attendee.alerts.dniInvalid && <span>⚠️</span>}
                              </div>
                            </td>
                            <td>
                              {(attendee.isIncomplete || attendee.alerts.dniInvalid) ? 
                                <span className="status-tag incomplete">Incompleto</span> :
                                data?.fullDataEnabled ? <span className="status-tag full">Validado</span> : <span className="status-tag masked">Protegido</span>
                              }
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={5} className="no-results">No se encontraron resultados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="pagination-container">
                  <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="pagination-btn">Anterior</button>
                  <div className="pagination-info">Página {currentPage} de {totalPages}</div>
                  <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="pagination-btn">Siguiente</button>
                </div>
              )}
              
              <div className="privacy-notice">
                <p>ℹ️ {data?.message}</p>
                <p className="sync-info">🕒 Datos sincronizados: 08:00, 12:30, 17:30, 20:00.</p>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="main-footer">
        <p>&copy; 2026 FemCoders Club - Partner Safety Portal</p>
      </footer>
      {showPreview && (
        <div className="preview-modal-overlay">
          <div className="preview-modal">
            <div className="modal-header">
              <h2>Vista Previa de Notificaciones Brevo</h2>
              <button className="btn-close" onClick={() => setShowPreview(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-intro">Esta es la lista oficial de personas que necesitan atención (DNI incompleto o entradas duplicadas).</p>
              <div className="preview-table-wrapper">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Nombre</th>
                      <th>Motivo</th>
                      <th>Notificado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewList.map((p, idx) => (
                      <tr key={idx}>
                        <td>{p.email}</td>
                        <td>{p.name}</td>
                        <td><span className="motive-tag">{p.motive}</span></td>
                        <td>
                          {p.isNotified ? (
                            <div className="notified-status">
                              <span className="status-tag full">Enviado</span>
                              <small>{new Date(p.notifiedAt).toLocaleDateString()}</small>
                            </div>
                          ) : (
                            <span className="status-tag incomplete">Pendiente</span>
                          )}
                        </td>
                        <td>
                          <button 
                            className="btn-admin-premium btn-xs" 
                            onClick={() => handleNotifyAttendee(p.email, p.type)}
                            disabled={loading}
                          >
                            {loading ? '...' : p.isNotified ? 'Reenviar' : 'Enviar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-admin-premium" onClick={() => setShowPreview(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
      {showTemplatePreview && (
        <div className="preview-modal-overlay">
          <div className="preview-modal email-large">
            <div className="modal-header">
              <h2>Vista Previa del Diseño Corporativo</h2>
              <button className="btn-close" onClick={() => setShowTemplatePreview(false)}>×</button>
            </div>
            <div className="modal-body template-bg">
              <div 
                className="email-render-container"
                dangerouslySetInnerHTML={{ __html: templateHtml }}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-admin-premium" onClick={() => setShowTemplatePreview(false)}>Entendido</button>
            </div>
          </div>
        </div>
      )}
      {showTemplatePreview && (
        <div className="preview-modal-overlay">
          <div className="preview-modal email-large">
            <div className="modal-header">
              <h2>Vista Previa del Diseño Corporativo</h2>
              <button className="btn-close" onClick={() => setShowTemplatePreview(false)}>×</button>
            </div>
            <div className="modal-body template-bg">
              <div 
                className="email-render-container"
                dangerouslySetInnerHTML={{ __html: templateHtml }}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-admin-premium" onClick={() => setShowTemplatePreview(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LoginView: React.FC<{ 
  inputKey: string, setInputKey: (v: string) => void, handleLogin: (e: React.FormEvent) => void, loading: boolean, error: string | null
}> = ({ inputKey, setInputKey, handleLogin, loading, error }) => (
  <div className="login-screen">
    <div className="login-card">
      <div className="login-logos"><img src="/logo-femcoders.jpg" alt="FemCoders" /></div>
      <h2>Portal de Partners</h2>
      <p>Introduce tu código de acceso.</p>
      <form onSubmit={handleLogin}>
        <input type="password" placeholder="Código..." value={inputKey} onChange={(e) => setInputKey(e.target.value)} disabled={loading} />
        {error && <div className="login-error">⚠️ {error}</div>}
        <button type="submit" className="login-btn" disabled={loading}>{loading ? 'Verificando...' : 'Entrar'}</button>
      </form>
    </div>
  </div>
);

export default App;
