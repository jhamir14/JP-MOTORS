import { describe, expect, it } from "vitest";
import {
  COLUMNAS,
  MAX_DIAS_RANGO,
  diasEntre,
  distribucionScore,
  indicadores,
  nombreArchivo,
  parsearFiltros,
  porcentaje,
  queryFiltros,
  resumenMora,
  totalesCancelados,
  totalesCobranzas,
  totalesColocaciones,
  usaRango,
  type FilaCancelado,
  type FilaCobranza,
  type FilaColocacion,
  type FilaMora,
  type KpisCrudos,
} from "../reportes";

const HOY = "2026-11-26";
const UUID = "0f8fad5b-d9cb-469f-a165-70867728950e";

describe("parsearFiltros", () => {
  it("por defecto: del 1 del mes a hoy, sin filtros", () => {
    const { filtros, avisos } = parsearFiltros({}, HOY);
    expect(filtros).toEqual({ desde: "2026-11-01", hasta: HOY, tipo: null, asesor: null, sucursal: null });
    expect(avisos).toEqual([]);
  });

  it("acepta fechas, tipo, asesor y sucursal válidos (también desde URLSearchParams)", () => {
    const q = new URLSearchParams({ desde: "2026-01-01", hasta: "2026-06-30", tipo: "CREDITO_CELULAR", asesor: UUID.toUpperCase(), sucursal: UUID });
    const { filtros } = parsearFiltros(q, HOY);
    expect(filtros).toEqual({ desde: "2026-01-01", hasta: "2026-06-30", tipo: "CREDITO_CELULAR", asesor: UUID, sucursal: UUID });
  });

  it("ignora valores inválidos o inyectados y avisa de las fechas malas", () => {
    const { filtros, avisos } = parsearFiltros({ desde: "2026-02-30", hasta: "hoy'; drop table", tipo: "OTRO", asesor: "1 or 1=1", sucursal: ["x"] }, HOY);
    expect(filtros).toEqual({ desde: "2026-11-01", hasta: HOY, tipo: null, asesor: null, sucursal: null });
    expect(avisos).toHaveLength(2);
  });

  it("intercambia fechas invertidas y limita el rango", () => {
    expect(parsearFiltros({ desde: "2026-10-31", hasta: "2026-10-01" }, HOY).filtros).toMatchObject({ desde: "2026-10-01", hasta: "2026-10-31" });
    const { filtros, avisos } = parsearFiltros({ desde: "2020-01-01", hasta: "2026-11-26" }, HOY);
    expect(diasEntre(filtros.desde, filtros.hasta)).toBe(MAX_DIAS_RANGO);
    expect(avisos[0]).toMatch(/rango máximo/);
  });

  it("queryFiltros conserva los filtros y agrega extras", () => {
    const { filtros } = parsearFiltros({ desde: "2026-11-01", hasta: "2026-11-15", tipo: "CREDITO_VEHICULAR" }, HOY);
    expect(queryFiltros(filtros, { formato: "csv" })).toBe("desde=2026-11-01&hasta=2026-11-15&tipo=CREDITO_VEHICULAR&formato=csv");
  });
});

describe("porcentaje", () => {
  it("un decimal y 0 si no hay base", () => {
    expect(porcentaje(1, 3)).toBe(33.3);
    expect(porcentaje(2, 3)).toBe(66.7);
    expect(porcentaje(5, 0)).toBe(0);
    expect(porcentaje(0, 10)).toBe(0);
  });
});

const coloc = (o: Partial<FilaColocacion>): FilaColocacion => ({
  codigo: "JP-1", tipo: "CREDITO_CELULAR", fecha_desembolso: "2026-11-02", cliente: "Ana", documento: "40000001", asesor: "Luis", sucursal: null,
  monto_total: 1000, cuota_inicial: 200, monto_financiado: 800, total_intereses: 160, monto_total_pagar: 960, numero_cuotas: 8,
  frecuencia: "SEMANAL", tasa_porcentaje: 2.5, estado: "VIGENTE", ...o,
});

describe("totalesColocaciones", () => {
  it("suma montos, ticket promedio y agrupa por tipo y asesor", () => {
    const t = totalesColocaciones([
      coloc({}),
      coloc({ codigo: "JP-2", tipo: "CREDITO_VEHICULAR", monto_total: 10000.1, cuota_inicial: 2000, monto_financiado: 8000.1, total_intereses: 1920.05, monto_total_pagar: 9920.15, asesor: null }),
    ]);
    expect(t).toMatchObject({ creditos: 2, ventas: 11000.1, inicial: 2200, financiado: 8800.1, intereses: 2080.05, totalPagar: 10880.15, ticketPromedio: 4400.05 });
    expect(t.porTipo).toEqual([
      { clave: "CREDITO_CELULAR", creditos: 1, financiado: 800 },
      { clave: "CREDITO_VEHICULAR", creditos: 1, financiado: 8000.1 },
    ]);
    expect(t.porAsesor.map((a) => a.clave)).toEqual(["Luis", "Sin asesor"]);
  });

  it("sin filas: todo en cero", () => {
    expect(totalesColocaciones([])).toMatchObject({ creditos: 0, financiado: 0, ticketPromedio: 0, porTipo: [] });
  });
});

const pago = (o: Partial<FilaCobranza>): FilaCobranza => ({
  numero_recibo: 1, fecha_pago: "2026-11-10", codigo: "JP-1", tipo: "CREDITO_CELULAR", cliente: "Ana", metodo: "EFECTIVO", numero_operacion: null,
  registrado_por: "Rosa", asesor: "Luis", sucursal: null, monto: 100, mora: 5, interes: 15, capital: 80, ...o,
});

describe("totalesCobranzas", () => {
  it("separa efectivo / digital y mora / interés / capital; ingresos = interés + mora", () => {
    const t = totalesCobranzas([
      pago({}),
      pago({ numero_recibo: 2, metodo: "YAPE", monto: 50.1, mora: 0, interes: 10.05, capital: 40.05, registrado_por: "Ana" }),
      pago({ numero_recibo: 3, monto: 30, mora: 0, interes: 0, capital: 0, registrado_por: "Sistema anterior" }),
    ]);
    expect(t).toMatchObject({ pagos: 3, total: 180.1, efectivo: 130, digital: 50.1, mora: 5, interes: 25.05, capital: 120.05, ingresos: 30.05, sinAplicar: 30 });
    expect(t.porMetodo).toEqual([{ clave: "EFECTIVO", pagos: 2, total: 130 }, { clave: "YAPE", pagos: 1, total: 50.1 }]);
    expect(t.porCobrador.map((c) => c.clave)).toEqual(["Ana", "Rosa", "Sistema anterior"]);
  });

  it("los decimales no se acumulan con error de coma flotante", () => {
    const filas = Array.from({ length: 10 }, (_, i) => pago({ numero_recibo: i, monto: 0.1, mora: 0, interes: 0.1, capital: 0 }));
    expect(totalesCobranzas(filas)).toMatchObject({ total: 1, interes: 1, sinAplicar: 0 });
  });
});

const mora = (o: Partial<FilaMora>): FilaMora => ({
  codigo: "JP-1", tipo: "CREDITO_CELULAR", cliente: "Ana", telefono: null, asesor: null, sucursal: null, cuotas_vencidas: 1,
  primera_vencida: "2026-11-20", dias_atraso: 6, tramo: "MORA_1_7", saldo_vencido: 100, mora_pendiente: 3, saldo_total: 500, ...o,
});

describe("resumenMora", () => {
  it("agrupa por tramo con % de créditos y de cartera; incluye tramos vacíos", () => {
    const r = resumenMora(
      [mora({}), mora({ codigo: "JP-2", tramo: "MORA_MAS_30", dias_atraso: 45, saldo_vencido: 300, mora_pendiente: 40, saldo_total: 900 })],
      4000,
      20,
    );
    expect(r).toMatchObject({ creditos: 2, saldoVencido: 400, moraPendiente: 43, saldoTotalEnRiesgo: 1400, porcentajeCartera: 10, porcentajeCreditos: 10 });
    expect(r.tramos).toEqual([
      { tramo: "MORA_1_7", creditos: 1, saldoVencido: 100, porcentajeCreditos: 5, porcentajeCartera: 2.5 },
      { tramo: "MORA_8_15", creditos: 0, saldoVencido: 0, porcentajeCreditos: 0, porcentajeCartera: 0 },
      { tramo: "MORA_16_30", creditos: 0, saldoVencido: 0, porcentajeCreditos: 0, porcentajeCartera: 0 },
      { tramo: "MORA_MAS_30", creditos: 1, saldoVencido: 300, porcentajeCreditos: 5, porcentajeCartera: 7.5 },
    ]);
  });

  it("sin cartera no divide entre cero", () => {
    expect(resumenMora([], 0, 0)).toMatchObject({ creditos: 0, porcentajeCartera: 0, porcentajeCreditos: 0 });
  });
});

describe("totalesCancelados", () => {
  const c = (o: Partial<FilaCancelado>): FilaCancelado => ({
    codigo: "JP-1", tipo: "CREDITO_CELULAR", cliente: "Ana", asesor: null, sucursal: null, fecha_desembolso: "2026-01-01", fecha_cancelacion: "2026-07-01",
    dias_credito: 181, monto_financiado: 800, total_intereses: 160, total_pagado: 960, mora_cobrada: 0, cuotas_con_atraso: 0, numero_cuotas: 26, ...o,
  });
  it("% sin atraso, duración promedio y totales", () => {
    const t = totalesCancelados([c({}), c({ codigo: "JP-2", dias_credito: 100, cuotas_con_atraso: 3, mora_cobrada: 12.5, total_pagado: 972.5 })]);
    expect(t).toMatchObject({ creditos: 2, sinAtraso: 1, porcentajeSinAtraso: 50, diasPromedio: 141, pagado: 1932.5, moraCobrada: 12.5, intereses: 320 });
  });
});

describe("indicadores", () => {
  const base: KpisCrudos = {
    hoy: HOY, creditos_activos: 40, creditos_en_mora: 10, cartera_vigente: 200000, saldo_vencido: 30000, capital_pendiente: 150000,
    colocado_mes: 50000, creditos_mes: 6, cobrado_hoy: 1200, pagos_hoy: 8, cobrado_mes: 40000, interes_cobrado_mes: 6000.4, mora_cobrada_mes: 300.2,
    capital_cobrado_mes: 33699.4, intereses_pactados_activos: 80000, intereses_cobrados_activos: 20000,
  };
  it("% de mora sobre la cartera y sobre los créditos, avance de intereses e ingresos del mes", () => {
    expect(indicadores(base)).toMatchObject({ porcentajeMoraCartera: 15, porcentajeCreditosEnMora: 25, porcentajeInteresCobrado: 25, ingresosMes: 6300.6 });
  });
  it("cartera vacía: 0 % (sin NaN)", () => {
    const k = indicadores({ ...base, cartera_vigente: 0, saldo_vencido: 0, creditos_activos: 0, creditos_en_mora: 0, intereses_pactados_activos: 0 });
    expect([k.porcentajeMoraCartera, k.porcentajeCreditosEnMora, k.porcentajeInteresCobrado]).toEqual([0, 0, 0]);
  });
});

describe("distribucionScore", () => {
  it("siempre devuelve 5…1 y sin historial, con porcentajes", () => {
    const d = distribucionScore([{ score: 5, clientes: 2 }, { score: null, clientes: 6 }, { score: 2, clientes: 2 }]);
    expect(d.map((x) => x.score)).toEqual([5, 4, 3, 2, 1, null]);
    expect(d.find((x) => x.score === null)).toEqual({ score: null, clientes: 6, porcentaje: 60 });
    expect(d.find((x) => x.score === 4)?.clientes).toBe(0);
  });
});

describe("columnas y nombre de archivo", () => {
  it("cada reporte tiene columnas con título y la mora no usa rango", () => {
    for (const cols of Object.values(COLUMNAS)) expect(cols.length).toBeGreaterThan(5);
    expect(usaRango("mora")).toBe(false);
    expect(COLUMNAS.mora.find((c) => c.titulo === "Tramo")?.valor(mora({ tramo: "MORA_MAS_30" }))).toBe("Más de 30 días");
  });
  it("nombre del archivo con el rango", () => {
    const f = parsearFiltros({ desde: "2026-11-01", hasta: "2026-11-15" }, HOY).filtros;
    expect(nombreArchivo("cobranzas", f, "xlsx")).toBe("reporte-cobranzas-2026-11-01_a_2026-11-15.xlsx");
    expect(nombreArchivo("mora", f, "csv")).toBe("reporte-mora-al-2026-11-15.csv");
  });
});
