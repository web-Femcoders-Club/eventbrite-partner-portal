/// <reference types="vite/client" />
import React, { useEffect, useState } from 'react';
import './index.css';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
    infoRequested: number;
    dniMissing: number;
    dniInvalid: number;
    multipleEntries: number;
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
  
  // Gestión de Acceso
  const [apiKey, setApiKey] = useState<string | null>(localStorage.getItem('portal_token'));
  const [inputKey, setInputKey] = useState('');

  // En producción (Railway) usamos el mismo servidor, en local apuntamos al puerto 3001
  const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
  const API_URL = `${API_BASE}/api/partners/active-event`;
  
  // Lógica de Bloqueo de Exportación (Solo 26 de Marzo 2026)
  const isEventDay = () => {
    const today = new Date();
    // 26 de Marzo de 2026
    return today.getFullYear() === 2026 && 
           today.getMonth() === 2 && // Marzo es 2 (0-indexed)
           today.getDate() === 26;
  };

  const canExport = isEventDay() || data?.partner?.includes('Admin');

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
    if (!data) return;
    const csvHeader = 'Nombre,Apellidos,Email,DNI,Estado\n';
    const csvRows = filteredAttendees.map(a => {
      const email = a.orderEmail || a.email || '';
      const dni = a.dni || (a.alerts.isInfoRequested ? 'PENDIENTE' : 'N/A');
      const status = (a.isIncomplete || a.alerts.dniInvalid) ? 'Incompleto' : 'Validado';
      // Limpiar comas para no romper el CSV
      const cleanFName = (a.firstName || '').replace(/,/g, '');
      const cleanLName = (a.lastName || '').replace(/,/g, '');
      return `"${cleanFName}","${cleanLName}","${email}","${dni}","${status}"`;
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
    if (!data) return;
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
    if (!data) return;

    // Función interna para limpiar acentos y evitar el error de espaciado en jsPDF
    const cleanForPDF = (str: string) => {
      if (!str) return '';
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' }) as any;
    
    const tableColumn = ["#", "Titular / Comprador", "Email", "DNI / ID", "Entradas", "Estado"];
    const tableRows = filteredAttendees.map((a, i) => [
      i + 1,
      cleanForPDF(`${a.firstName} ${a.lastName}`),
      a.orderEmail || a.email,
      a.dni || (a.alerts.isInfoRequested ? 'PENDIENTE' : 'N/A'),
      a.ticketCount,
      (a.isIncomplete || a.alerts.dniInvalid) ? 'Incompleto' : 'Validado'
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      styles: { 
        fontSize: 9, 
        cellPadding: 3, 
        font: 'helvetica',
        valign: 'middle',
        overflow: 'linebreak' 
      },
      headStyles: { 
        fillColor: [71, 55, 187], // Azul corporativo (#4737bb)
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 75 }, // Aumentado para nombres largos
        2: { cellWidth: 80 }, // Aumentado para emails
        3: { cellWidth: 35, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' }
      }
    });

    // Título y branding
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
          <div className="logos-group">
            <img src="/logo-femcoders.jpg" alt="FemCoders Club" className="brand-logo" onError={(e) => e.currentTarget.src = 'https://via.placeholder.com/150?text=FemCoders'} />
            <div className="divider"></div>
            <img src="/logo-infojobs.jpg" alt="Partner Logo" className="partner-logo" onError={(e) => e.currentTarget.src = 'https://via.placeholder.com/150?text=Partner'} />
          </div>
          <div className="user-info">
            <span className="badge">Partner: {data?.partner}</span>
            <button onClick={handleLogout} className="btn-logout" title="Cerrar sesión">Salir</button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="welcome-banner">
          <div className="banner-text">
            <h1>Panel de Control InfoJobs</h1>
            <p>Estado de salud de las inscripciones y cumplimiento normativo.</p>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value highlight">{data?.totalRegistrations}</span>
              <span className="stat-label">Entradas Totales</span>
            </div>
            {data?.summary && (data.summary.infoRequested > 0 || data.summary.dniInvalid > 0) && (
              <div className="alert-panel shadow-soft">
                <h3>🔔 Incidencias detectadas</h3>
                <div className="alert-items">
                  {data.summary.infoRequested > 0 && <span>Incompletos: <strong>{data.summary.infoRequested}</strong></span>}
                  {data.summary.dniInvalid > 0 && <span>DNI Incorrectos: <strong>{data.summary.dniInvalid}</strong></span>}
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
                <button 
                  onClick={() => fetchRegistrations()} 
                  className="btn-refresh"
                  disabled={loading}
                  title="Sincronizar con Eventbrite"
                >
                  {loading ? '...' : '🔄'}
                </button>
              </div>
            </div>
            <div className="table-controls">
              <div className="export-tools">
                <button 
                  onClick={handleExportCSV} 
                  className="btn-export csv" 
                  disabled={!canExport}
                  title={canExport ? "Descargar CSV" : "Exportación bloqueada hasta el 26 de marzo"}
                >
                  CSV
                </button>
                <button 
                  onClick={handleExportExcel} 
                  className="btn-export excel" 
                  disabled={!canExport}
                  title={canExport ? "Descargar Excel" : "Exportación bloqueada hasta el 26 de marzo"}
                >
                  Excel
                </button>
                <button 
                  onClick={handleExportPDF} 
                  className="btn-export pdf" 
                  disabled={!canExport}
                  title={canExport ? "Descargar PDF" : "Exportación bloqueada hasta el 26 de marzo"}
                >
                  PDF
                </button>
              </div>
              {!canExport && (
                <div className="export-lock-notice">
                  🔒 Exportación bloqueada hasta el 26 de marzo (Día del Evento)
                </div>
              )}
              <div className="rows-selector">
                <span>Mostrar:</span>
                <select 
                  title="Número de registros por página"
                  value={itemsPerPage} 
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="search-box">
                <input 
                  type="text" 
                  placeholder="Buscar por nombre, apellidos o email..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
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
                  <th>Acceso / Alertas</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAttendees.length > 0 ? (
                  paginatedAttendees.map((attendee, index) => {
                    const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                    return (
                      <tr key={index} className={attendee.isIncomplete ? 'row-incomplete' : ''}>
                        <td className="index-cell">{globalIndex}</td>
                        <td>
                          <div className="name-with-badge">
                            <div className="identity-container">
                              <div className="main-identity">
                                <strong>{attendee.firstName} {attendee.lastName}</strong>
                                {attendee.ticketCount > 1 && (
                                  <span className="owner-badge">Reserva x{attendee.ticketCount}</span>
                                )}
                              </div>
                              
                              {attendee.guests && attendee.guests.length > 0 && (
                                <div className="guest-names">
                                  👥 Incluye a: {attendee.guests.join(', ')}
                                </div>
                              )}

                              {attendee.isFullyPending ? (
                                <span className="pending-status">⚠️ Esperando datos de asistentes</span>
                              ) : attendee.pendingCount > 0 && (
                                <span className="pending-alert">
                                  ⏳ Falta identificar {attendee.pendingCount} {attendee.pendingCount === 1 ? 'acompañante' : 'acompañantes'}
                                </span>
                              )}
                              
                              <small className="full-email">{attendee.orderEmail || attendee.email}</small>
                            </div>
                            
                            {attendee.ticketCount > 1 && (
                              <span className="ticket-badge">x{attendee.ticketCount}</span>
                            )}
                          </div>
                        </td>
                        <td className="dni-cell">
                          <span className={attendee.alerts.dniInvalid ? 'text-warning' : ''}>
                            {attendee.isIncomplete ? 'No proporcionado' : maskDni(attendee.dni)}
                          </span>
                          {attendee.alerts.dniInvalid && <span className="label-warning">Formato inválido</span>}
                        </td>
                        <td>
                          <div className="alerts-group">
                            {attendee.ticketCount > 1 && <span className="icon-tip" title="Múltiples entradas">👥</span>}
                            {attendee.alerts.dniInvalid && <span className="icon-tip" title="DNI no parece válido">⚠️</span>}
                            {attendee.alerts.isInfoRequested && <span className="icon-tip" title="Faltan datos de Eventbrite">📧</span>}
                          </div>
                        </td>
                        <td>
                          {attendee.isIncomplete ? 
                            <span className="status-tag incomplete">Incompleto</span> :
                            data?.fullDataEnabled ? 
                              <span className="status-tag full">Validado</span> : 
                              <span className="status-tag masked">Protegido</span>
                          }
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="no-results">
                      No se encontraron resultados para <strong>"{searchTerm}"</strong>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination-container">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                &larr; Anterior
              </button>
              
              <div className="pagination-info">
                Página <strong>{currentPage}</strong> de {totalPages}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Siguiente &rarr;
              </button>
            </div>
          )}
          
          <div className="privacy-notice">
            <p>ℹ️ {data?.message}</p>
            <p className="sync-info">
              🕒 Los datos se sincronizan automáticamente a las 08:00, 12:30, 17:30 y 20:00 (Hora España).
            </p>
          </div>
        </section>
      </main>

      <footer className="main-footer">
        <p>&copy; 2024 FemCoders Club - Partner Safety Portal</p>
      </footer>
    </div>
  );
};

// Componente de Login simple
const LoginView: React.FC<{ 
  inputKey: string, 
  setInputKey: (v: string) => void, 
  handleLogin: (e: React.FormEvent) => void,
  loading: boolean,
  error: string | null
}> = ({ inputKey, setInputKey, handleLogin, loading, error }) => (
  <div className="login-screen">
    <div className="login-card">
      <div className="login-logos">
        <img src="/logo-femcoders.jpg" alt="FemCoders" />
      </div>
      <h2>Portal de Partners</h2>
      <p>Introduce tu código de acceso para consultar los asistentes de tu evento.</p>
      
      <form onSubmit={handleLogin}>
        <div className="input-group">
          <input 
            type="password" 
            placeholder="Introduce el código de socio..." 
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            disabled={loading}
          />
        </div>
        {error && <div className="login-error">⚠️ {error}</div>}
        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? 'Verificando...' : 'Acceder al Portal'}
        </button>
      </form>
      
      <div className="login-footer">
        ¿Has perdido tu código? <a href="mailto:irina.ichim@femcodersclub.com">Contactar soporte</a>
      </div>
    </div>
  </div>
);

export default App;
