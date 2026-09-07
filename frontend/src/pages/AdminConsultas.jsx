import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  limit,
  startAfter,
  endBefore,
  limitToLast,
} from "firebase/firestore";
import * as XLSX from "xlsx";
import { db } from "../firebase/firebaseConfig";

const PAGE_SIZE = 20;

function AdminConsultas() {
  const [consultas, setConsultas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [institucionFiltro, setInstitucionFiltro] = useState("todas");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const [primerDoc, setPrimerDoc] = useState(null);
  const [ultimoDoc, setUltimoDoc] = useState(null);
  const [historialPrevios, setHistorialPrevios] = useState([]);
  const [puedeSiguiente, setPuedeSiguiente] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);

  const baseQuery = () =>
    query(collection(db, "queries"), orderBy("createdAt", "desc"), limit(PAGE_SIZE));

  const cargarPaginaInicial = async () => {
    setLoading(true);
    try {
      const q = baseQuery();
      const snapshot = await getDocs(q);

      const docs = snapshot.docs;
      const datos = docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setConsultas(datos);
      setPrimerDoc(docs[0] || null);
      setUltimoDoc(docs[docs.length - 1] || null);
      setHistorialPrevios([]);
      setPaginaActual(1);
      setPuedeSiguiente(docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error cargando consultas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPaginaInicial();
  }, []);

  const irSiguiente = async () => {
    if (!ultimoDoc) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, "queries"),
        orderBy("createdAt", "desc"),
        startAfter(ultimoDoc),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;

      if (!docs.length) {
        setPuedeSiguiente(false);
        setLoading(false);
        return;
      }

      const datos = docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setHistorialPrevios((prev) => [...prev, primerDoc]);
      setConsultas(datos);
      setPrimerDoc(docs[0] || null);
      setUltimoDoc(docs[docs.length - 1] || null);
      setPaginaActual((prev) => prev + 1);
      setPuedeSiguiente(docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error cargando siguiente página:", error);
    } finally {
      setLoading(false);
    }
  };

  const irAnterior = async () => {
    if (!primerDoc || historialPrevios.length === 0) return;

    setLoading(true);
    try {
      const nuevoHistorial = [...historialPrevios];
      const docReferencia = nuevoHistorial.pop();

      const q = query(
        collection(db, "queries"),
        orderBy("createdAt", "desc"),
        endBefore(primerDoc),
        limitToLast(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;

      const datos = docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setConsultas(datos);
      setPrimerDoc(docs[0] || null);
      setUltimoDoc(docs[docs.length - 1] || null);
      setHistorialPrevios(nuevoHistorial);
      setPaginaActual((prev) => Math.max(1, prev - 1));
      setPuedeSiguiente(true);
    } catch (error) {
      console.error("Error cargando página anterior:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (createdAt) => {
    if (!createdAt?.seconds) return "Sin fecha";
    return new Date(createdAt.seconds * 1000).toLocaleString();
  };

  const convertirFecha = (createdAt) => {
    if (!createdAt?.seconds) return null;
    return new Date(createdAt.seconds * 1000);
  };

  const categoriasDisponibles = useMemo(() => {
    const valores = [...new Set(consultas.map((c) => c.category).filter(Boolean))];
    return valores.sort();
  }, [consultas]);

  const institucionesDisponibles = useMemo(() => {
    const valores = [...new Set(consultas.map((c) => c.institution).filter(Boolean))];
    return valores.sort();
  }, [consultas]);

  const consultasFiltradas = useMemo(() => {
    let resultado = [...consultas];

    if (textoBusqueda.trim()) {
      const texto = textoBusqueda.toLowerCase();
      resultado = resultado.filter((item) => {
        const question = (item.question || "").toLowerCase();
        const answer = (item.answer || "").toLowerCase();
        const category = (item.category || "").toLowerCase();
        const institution = (item.institution || "").toLowerCase();

        return (
          question.includes(texto) ||
          answer.includes(texto) ||
          category.includes(texto) ||
          institution.includes(texto)
        );
      });
    }

    if (categoriaFiltro !== "todas") {
      resultado = resultado.filter((item) => item.category === categoriaFiltro);
    }

    if (institucionFiltro !== "todas") {
      resultado = resultado.filter(
        (item) => item.institution === institucionFiltro
      );
    }

    if (estadoFiltro !== "todos") {
      resultado = resultado.filter((item) => item.status === estadoFiltro);
    }

    if (fechaDesde) {
      const desde = new Date(`${fechaDesde}T00:00:00`);
      resultado = resultado.filter((item) => {
        const fecha = convertirFecha(item.createdAt);
        return fecha && fecha >= desde;
      });
    }

    if (fechaHasta) {
      const hasta = new Date(`${fechaHasta}T23:59:59`);
      resultado = resultado.filter((item) => {
        const fecha = convertirFecha(item.createdAt);
        return fecha && fecha <= hasta;
      });
    }

    return resultado;
  }, [
    consultas,
    textoBusqueda,
    categoriaFiltro,
    institucionFiltro,
    estadoFiltro,
    fechaDesde,
    fechaHasta,
  ]);

  const resumen = useMemo(() => {
    const total = consultasFiltradas.length;
    const exitosas = consultasFiltradas.filter((c) => c.status === "success").length;
    const errores = consultasFiltradas.filter((c) => c.status === "error").length;

    const promedio =
      total > 0
        ? Math.round(
            consultasFiltradas.reduce(
              (acc, item) => acc + (item.responseTimeMs || 0),
              0
            ) / total
          )
        : 0;

    return { total, exitosas, errores, promedio };
  }, [consultasFiltradas]);

  const limpiarFiltros = () => {
    setTextoBusqueda("");
    setCategoriaFiltro("todas");
    setInstitucionFiltro("todas");
    setEstadoFiltro("todos");
    setFechaDesde("");
    setFechaHasta("");
  };

  const exportarExcel = () => {
    if (!consultasFiltradas.length) return;

    const datos = consultasFiltradas.map((item) => ({
      Fecha: formatearFecha(item.createdAt),
      Pregunta: item.question || "",
      Respuesta: item.answer || "",
      Categoria: item.category || "",
      Institucion: item.institution || "",
      Estado: item.status || "",
      TiempoMs: item.responseTimeMs || "",
      SessionId: item.sessionId || "",
      Source: item.source || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(datos);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Consultas");
    XLSX.writeFile(workbook, `consultas_buscaqroo_pagina_${paginaActual}.xlsx`);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Consultas registradas</h1>

        <div style={styles.headerButtons}>
          <button
            style={styles.secondaryButton}
            onClick={() => {
              window.location.href = "/admin";
            }}
          >
            Volver al panel
          </button>

          <button style={styles.primaryButton} onClick={cargarPaginaInicial}>
            Recargar
          </button>
        </div>
      </div>

      <div style={styles.resumenGrid}>
        <div style={styles.resumenCard}>
          <div style={styles.resumenTitulo}>Total en página</div>
          <div style={styles.resumenValor}>{resumen.total}</div>
        </div>

        <div style={styles.resumenCard}>
          <div style={styles.resumenTitulo}>Exitosas</div>
          <div style={styles.resumenValor}>{resumen.exitosas}</div>
        </div>

        <div style={styles.resumenCard}>
          <div style={styles.resumenTitulo}>Errores</div>
          <div style={styles.resumenValor}>{resumen.errores}</div>
        </div>

        <div style={styles.resumenCard}>
          <div style={styles.resumenTitulo}>Promedio respuesta</div>
          <div style={styles.resumenValor}>{resumen.promedio} ms</div>
        </div>
      </div>

      <div style={styles.filtersBox}>
        <div style={styles.filtersGrid}>
          <input
            type="text"
            placeholder="Buscar por pregunta, respuesta, categoría o institución"
            value={textoBusqueda}
            onChange={(e) => setTextoBusqueda(e.target.value)}
            style={styles.input}
          />

          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            style={styles.input}
          >
            <option value="todas">Todas las categorías</option>
            {categoriasDisponibles.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={institucionFiltro}
            onChange={(e) => setInstitucionFiltro(e.target.value)}
            style={styles.input}
          >
            <option value="todas">Todas las instituciones</option>
            {institucionesDisponibles.map((inst) => (
              <option key={inst} value={inst}>
                {inst}
              </option>
            ))}
          </select>

          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            style={styles.input}
          >
            <option value="todos">Todos los estados</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
          </select>

          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            style={styles.input}
          />

          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.actionRow}>
          <button style={styles.secondaryButton} onClick={limpiarFiltros}>
            Limpiar filtros
          </button>

          <button style={styles.primaryButton} onClick={exportarExcel}>
            Exportar Excel
          </button>
        </div>
      </div>

      <div style={styles.paginationBar}>
        <button
          style={styles.secondaryButton}
          onClick={irAnterior}
          disabled={paginaActual === 1 || loading}
        >
          Anterior
        </button>

        <div style={styles.pageIndicator}>Página {paginaActual}</div>

        <button
          style={styles.secondaryButton}
          onClick={irSiguiente}
          disabled={!puedeSiguiente || loading}
        >
          Siguiente
        </button>
      </div>

      {loading ? (
        <p>Cargando consultas...</p>
      ) : consultasFiltradas.length === 0 ? (
        <p>No hay consultas que coincidan con los filtros en esta página.</p>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Pregunta</th>
                <th style={styles.th}>Respuesta</th>
                <th style={styles.th}>Categoría</th>
                <th style={styles.th}>Institución</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {consultasFiltradas.map((item) => (
                <tr key={item.id}>
                  <td style={styles.td}>{formatearFecha(item.createdAt)}</td>
                  <td style={styles.td}>{item.question || "-"}</td>
                  <td style={styles.td}>{item.answer || "-"}</td>
                  <td style={styles.td}>{item.category || "-"}</td>
                  <td style={styles.td}>{item.institution || "-"}</td>
                  <td style={styles.td}>{item.status || "-"}</td>
                  <td style={styles.td}>
                    {item.responseTimeMs ? `${item.responseTimeMs} ms` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f8f8f8",
    padding: "2rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
  },
  headerButtons: {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  resumenGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "1rem",
    marginBottom: "1.5rem",
  },
  resumenCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "1rem",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  },
  resumenTitulo: {
    color: "#666",
    fontSize: "0.95rem",
    marginBottom: "0.5rem",
  },
  resumenValor: {
    fontSize: "1.4rem",
    fontWeight: "bold",
    color: "#8b0030",
  },
  filtersBox: {
    background: "#fff",
    borderRadius: "12px",
    padding: "1rem",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
    marginBottom: "1.5rem",
  },
  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "0.75rem",
    marginBottom: "1rem",
  },
  input: {
    padding: "0.8rem",
    borderRadius: "10px",
    border: "1px solid #ccc",
    fontSize: "0.95rem",
    width: "100%",
  },
  actionRow: {
    display: "flex",
    gap: "0.75rem",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  paginationBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1rem",
    flexWrap: "wrap",
  },
  pageIndicator: {
    fontWeight: "bold",
    color: "#8b0030",
  },
  primaryButton: {
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
  tableWrapper: {
    overflowX: "auto",
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
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
    minWidth: "160px",
  },
};

export default AdminConsultas;