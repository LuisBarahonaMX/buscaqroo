import React, { useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import {
  collection,
  getDocs,
  orderBy,
  query,
  limit,
} from "firebase/firestore";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { auth, db } from "../firebase/firebaseConfig";

function AdminDashboard() {
  const [consultas, setConsultas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [compararAnterior, setCompararAnterior] = useState(true);

  const dashboardRef = useRef(null);

  const cerrarSesion = async () => {
    await signOut(auth);
    window.location.href = "/login-admin";
  };

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "queries"),
        orderBy("createdAt", "desc"),
        limit(1500)
      );

      const snapshot = await getDocs(q);
      const datos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setConsultas(datos);
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const convertirFecha = (createdAt) => {
    if (!createdAt?.seconds) return null;
    return new Date(createdAt.seconds * 1000);
  };

  const normalizarDia = (fecha) => {
    const d = new Date(fecha);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const diasEntre = (a, b) => {
    const ms = 1000 * 60 * 60 * 24;
    return Math.max(
      1,
      Math.round((normalizarDia(b) - normalizarDia(a)) / ms) + 1
    );
  };

  const hoy = useMemo(() => new Date(), []);
  const inicioHoy = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const inicio7 = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const inicio30 = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const rangoActual = useMemo(() => {
    const desde = fechaDesde ? new Date(`${fechaDesde}T00:00:00`) : inicio7;
    const hasta = fechaHasta ? new Date(`${fechaHasta}T23:59:59`) : hoy;
    return { desde, hasta };
  }, [fechaDesde, fechaHasta, hoy, inicio7]);

  const rangoAnterior = useMemo(() => {
    const dias = diasEntre(rangoActual.desde, rangoActual.hasta);
    const hastaAnterior = new Date(rangoActual.desde);
    hastaAnterior.setDate(hastaAnterior.getDate() - 1);
    hastaAnterior.setHours(23, 59, 59, 999);

    const desdeAnterior = new Date(hastaAnterior);
    desdeAnterior.setDate(desdeAnterior.getDate() - (dias - 1));
    desdeAnterior.setHours(0, 0, 0, 0);

    return { desde: desdeAnterior, hasta: hastaAnterior };
  }, [rangoActual]);

  const dentroDeRango = (fecha, desde, hasta) => {
    return fecha && fecha >= desde && fecha <= hasta;
  };

  const consultasActuales = useMemo(() => {
    return consultas.filter((item) =>
      dentroDeRango(convertirFecha(item.createdAt), rangoActual.desde, rangoActual.hasta)
    );
  }, [consultas, rangoActual]);

  const consultasAnteriores = useMemo(() => {
    return consultas.filter((item) =>
      dentroDeRango(
        convertirFecha(item.createdAt),
        rangoAnterior.desde,
        rangoAnterior.hasta
      )
    );
  }, [consultas, rangoAnterior]);

  const contarEnRango = (lista, desde, hasta) => {
    return lista.filter((item) =>
      dentroDeRango(convertirFecha(item.createdAt), desde, hasta)
    ).length;
  };

  const construirMetricas = (lista) => {
    const total = lista.length;
    const success = lista.filter((c) => c.status === "success").length;
    const error = lista.filter((c) => c.status === "error").length;

    const promedio =
      total > 0
        ? Math.round(
            lista.reduce((acc, item) => acc + (item.responseTimeMs || 0), 0) / total
          )
        : 0;

    const tasaExito = total > 0 ? Math.round((success / total) * 100) : 0;

    const categoriasMap = {};
    const institucionesMap = {};
    const preguntasMap = {};
    const porDiaMap = {};

    lista.forEach((item) => {
      const categoria = item.category || "Sin categoría";
      const institucion = item.institution || "No clasificada";
      const pregunta = (item.question || "").trim() || "Sin pregunta";

      categoriasMap[categoria] = (categoriasMap[categoria] || 0) + 1;
      institucionesMap[institucion] = (institucionesMap[institucion] || 0) + 1;
      preguntasMap[pregunta] = (preguntasMap[pregunta] || 0) + 1;

      const fecha = convertirFecha(item.createdAt);
      if (fecha) {
        const key = fecha.toISOString().slice(0, 10);
        porDiaMap[key] = (porDiaMap[key] || 0) + 1;
      }
    });

    const topCategorias = Object.entries(categoriasMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([nombre, total]) => ({ nombre, total }));

    const topInstituciones = Object.entries(institucionesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([nombre, total]) => ({ nombre, total }));

    const topPreguntas = Object.entries(preguntasMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([pregunta, total]) => ({ pregunta, total }));

    const porDia = Object.entries(porDiaMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([fecha, total]) => ({ fecha, total }));

    return {
      total,
      success,
      error,
      promedio,
      tasaExito,
      topCategorias,
      topInstituciones,
      topPreguntas,
      porDia,
      estadoData: [
        { nombre: "Success", total: success },
        { nombre: "Error", total: error },
      ],
    };
  };

  const metricasActuales = useMemo(
    () => construirMetricas(consultasActuales),
    [consultasActuales]
  );

  const metricasAnteriores = useMemo(
    () => construirMetricas(consultasAnteriores),
    [consultasAnteriores]
  );

  const totalesRapidos = useMemo(() => {
    return {
      hoy: contarEnRango(consultas, inicioHoy, hoy),
      sieteDias: contarEnRango(consultas, inicio7, hoy),
      treintaDias: contarEnRango(consultas, inicio30, hoy),
    };
  }, [consultas, hoy, inicioHoy, inicio7, inicio30]);

  const cambioPorcentual = (actual, anterior) => {
    if (!anterior && actual) return "Nuevo";
    if (!anterior) return "0%";
    const cambio = ((actual - anterior) / anterior) * 100;
    return `${cambio >= 0 ? "+" : ""}${Math.round(cambio)}%`;
  };

  const serieComparativa = useMemo(() => {
    const mapActual = {};
    const mapAnterior = {};

    metricasActuales.porDia.forEach((item) => {
      mapActual[item.fecha] = item.total;
    });

    metricasAnteriores.porDia.forEach((item) => {
      mapAnterior[item.fecha] = item.total;
    });

    const keys = [...new Set([...Object.keys(mapActual), ...Object.keys(mapAnterior)])].sort();

    return keys.map((fecha) => ({
      fecha,
      actual: mapActual[fecha] || 0,
      anterior: mapAnterior[fecha] || 0,
    }));
  }, [metricasActuales, metricasAnteriores]);

  const limpiarFechas = () => {
    setFechaDesde("");
    setFechaHasta("");
  };

  const exportarPDF = async () => {
    if (!dashboardRef.current) return;

    const canvas = await html2canvas(dashboardRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#f6f6f6",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth - 10;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 5;

    pdf.addImage(imgData, "PNG", 5, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 5;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 5, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save("dashboard_buscaqroo.pdf");
  };

  const COLORS = ["#8b0030", "#d89aad"];

  return (
    <div style={styles.container}>
      <div ref={dashboardRef}>
        <div style={styles.header}>
          <h1>Panel Administrador</h1>
          <div style={styles.headerButtons}>
            <button onClick={cargarDatos} style={styles.secondaryButton}>
              Recargar
            </button>
            <button onClick={exportarPDF} style={styles.primaryButton}>
              Exportar PDF
            </button>
            <button onClick={cerrarSesion} style={styles.logout}>
              Cerrar sesión
            </button>
          </div>
        </div>

        <div style={styles.filtersBox}>
          <div style={styles.filtersGrid}>
            <div>
              <label style={styles.labelSmall}>Fecha desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.labelSmall}>Fecha hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.checkboxBox}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={compararAnterior}
                  onChange={(e) => setCompararAnterior(e.target.checked)}
                />
                Comparar con periodo anterior
              </label>
            </div>
          </div>

          <div style={styles.actionRow}>
            <button style={styles.secondaryButton} onClick={limpiarFechas}>
              Limpiar fechas
            </button>
            <button
              style={styles.primaryButton}
              onClick={() => {
                window.location.href = "/admin/consultas";
              }}
            >
              Ver consultas registradas
            </button>
          </div>

          <div style={styles.rangeText}>
            Periodo actual: {rangoActual.desde.toLocaleDateString()} -{" "}
            {rangoActual.hasta.toLocaleDateString()}
            {compararAnterior && (
              <>
                {" | "}Periodo anterior: {rangoAnterior.desde.toLocaleDateString()} -{" "}
                {rangoAnterior.hasta.toLocaleDateString()}
              </>
            )}
          </div>
        </div>

        {loading ? (
          <p>Cargando métricas...</p>
        ) : (
          <>
            <div style={styles.quickGrid}>
              <MetricCard title="Consultas hoy" value={totalesRapidos.hoy} />
              <MetricCard title="Últimos 7 días" value={totalesRapidos.sieteDias} />
              <MetricCard title="Últimos 30 días" value={totalesRapidos.treintaDias} />
              <MetricCard title="Tasa de éxito" value={`${metricasActuales.tasaExito}%`} />
            </div>

            <div style={styles.gridResumen}>
              <MetricCard
                title="Total de consultas"
                value={metricasActuales.total}
                compare={
                  compararAnterior
                    ? cambioPorcentual(metricasActuales.total, metricasAnteriores.total)
                    : null
                }
              />
              <MetricCard
                title="Consultas exitosas"
                value={metricasActuales.success}
                compare={
                  compararAnterior
                    ? cambioPorcentual(metricasActuales.success, metricasAnteriores.success)
                    : null
                }
              />
              <MetricCard
                title="Consultas con error"
                value={metricasActuales.error}
                compare={
                  compararAnterior
                    ? cambioPorcentual(metricasActuales.error, metricasAnteriores.error)
                    : null
                }
              />
              <MetricCard
                title="Tiempo promedio"
                value={`${metricasActuales.promedio} ms`}
                compare={
                  compararAnterior
                    ? cambioPorcentual(
                        metricasActuales.promedio,
                        metricasAnteriores.promedio
                      )
                    : null
                }
              />
            </div>

            <div style={styles.chartGrid}>
              <div style={styles.chartCard}>
                <h2 style={styles.chartTitle}>Consultas por día</h2>
                <div style={styles.chartBox}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={serieComparativa}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        name="Actual"
                        stroke="#8b0030"
                        strokeWidth={3}
                      />
                      {compararAnterior && (
                        <Line
                          type="monotone"
                          dataKey="anterior"
                          name="Anterior"
                          stroke="#d89aad"
                          strokeWidth={2}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={styles.chartCard}>
                <h2 style={styles.chartTitle}>Estado de consultas</h2>
                <div style={styles.chartBox}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={metricasActuales.estadoData}
                        dataKey="total"
                        nameKey="nombre"
                        outerRadius={95}
                        label
                      >
                        {metricasActuales.estadoData.map((entry, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div style={styles.chartGrid}>
              <div style={styles.chartCard}>
                <h2 style={styles.chartTitle}>Top categorías</h2>
                <div style={styles.chartBox}>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={metricasActuales.topCategorias} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="nombre" type="category" width={130} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#8b0030" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={styles.chartCard}>
                <h2 style={styles.chartTitle}>Top instituciones</h2>
                <div style={styles.chartBox}>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={metricasActuales.topInstituciones} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="nombre" type="category" width={140} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#8b0030" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div style={styles.chartCard}>
              <h2 style={styles.chartTitle}>Top preguntas repetidas</h2>
              {metricasActuales.topPreguntas.length === 0 ? (
                <p>No hay datos.</p>
              ) : (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Pregunta</th>
                        <th style={styles.th}>Frecuencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metricasActuales.topPreguntas.map((item, index) => (
                        <tr key={`${item.pregunta}-${index}`}>
                          <td style={styles.td}>{item.pregunta}</td>
                          <td style={styles.td}>{item.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, compare }) {
  return (
    <div style={styles.cardResumen}>
      <div style={styles.label}>{title}</div>
      <div style={styles.value}>{value}</div>
      {compare && <div style={styles.compare}>{compare} vs periodo anterior</div>}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f6f6f6",
    padding: "2rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "2rem",
    flexWrap: "wrap",
  },
  headerButtons: {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  logout: {
    background: "#8b0030",
    color: "#fff",
    border: "none",
    padding: "0.8rem 1rem",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  secondaryButton: {
    background: "#fff",
    color: "#8b0030",
    border: "1px solid #8b0030",
    padding: "0.8rem 1rem",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  primaryButton: {
    background: "#8b0030",
    color: "#fff",
    border: "none",
    padding: "0.9rem 1.2rem",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  filtersBox: {
    background: "#fff",
    borderRadius: "14px",
    padding: "1rem",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
    marginBottom: "1.5rem",
  },
  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1rem",
    marginBottom: "1rem",
  },
  input: {
    padding: "0.8rem",
    borderRadius: "10px",
    border: "1px solid #ccc",
    fontSize: "0.95rem",
    width: "100%",
    marginTop: "0.35rem",
  },
  labelSmall: {
    color: "#555",
    fontSize: "0.9rem",
  },
  checkboxBox: {
    display: "flex",
    alignItems: "end",
  },
  checkboxLabel: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
    fontWeight: "bold",
    color: "#555",
  },
  actionRow: {
    display: "flex",
    gap: "0.75rem",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  rangeText: {
    marginTop: "1rem",
    color: "#555",
    fontSize: "0.95rem",
  },
  quickGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1rem",
    marginBottom: "1rem",
  },
  gridResumen: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1rem",
    marginBottom: "1.5rem",
  },
  cardResumen: {
    background: "#fff",
    borderRadius: "14px",
    padding: "1.2rem",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  },
  label: {
    color: "#666",
    marginBottom: "0.5rem",
  },
  value: {
    fontSize: "1.7rem",
    fontWeight: "bold",
    color: "#8b0030",
  },
  compare: {
    marginTop: "0.5rem",
    color: "#666",
    fontSize: "0.9rem",
  },
  chartGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "1rem",
    marginBottom: "1rem",
  },
  chartCard: {
    background: "#fff",
    borderRadius: "14px",
    padding: "1.2rem",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  },
  chartTitle: {
    marginTop: 0,
    marginBottom: "1rem",
  },
  chartBox: {
    width: "100%",
    height: "320px",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "1rem",
    background: "#8b0030",
    color: "#fff",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "1rem",
    borderBottom: "1px solid #eee",
    verticalAlign: "top",
  },
};

export default AdminDashboard;