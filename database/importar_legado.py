#!/usr/bin/env python3
"""
Migra el backup de la base anterior (Django + MySQL, volcado de HeidiSQL) al
esquema nuevo de Supabase (database/migrations).

Uso:
    python3 database/importar_legado.py RUTA/prestamos_backup.sql [SALIDA.sql]

Genera un archivo SQL (por defecto database/.legado/legado.sql, ignorado por
git porque contiene datos personales) que se ejecuta una sola vez sobre la
base ya migrada. Es idempotente: usa UUID deterministas y ON CONFLICT DO
NOTHING, así que volver a ejecutarlo no duplica registros.

Qué se importa
    users_client               → cliente
    inventory_moto             → unidad_vehiculo
    devices_device             → unidad_celular
    loans_prestamo             → credito (PRESTAMO_EFECTIVO)
    devices_devicesale         → credito (CREDITO_CELULAR)
    loans_cuotaprestamo /
    devices_deviceinstallment  → cuota + pago + aplicacion_pago

Qué NO se importa (a propósito)
    auth_*, django_*           → el personal se crea de nuevo en Supabase Auth
    icloud_password            → contraseñas en texto plano: no se guardan
    contracts_*                → tablas vacías en el backup

Decisiones de limpieza (se reportan al final de la ejecución)
    · El cronograma real manda: si la cabecera del préstamo dice un total
      distinto a la suma de sus cuotas, se usa la suma de las cuotas.
    · Si una cuota se pagó por encima de su monto, el excedente se registra
      como mora cobrada.
    · Documentos "OLD-xxxx", correos repetidos entre clientes y domicilios que
      solo dicen el distrito se consideran datos de relleno: el cliente queda
      con datos_incompletos = true para completarlo desde el panel.
"""

from __future__ import annotations

import collections
import json
import re
import sys
import uuid
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

NS = uuid.UUID("6f1c3a52-6c55-4e0f-9a3e-4a9d2a0b1c01")  # espacio de nombres fijo → UUID deterministas
CENT = Decimal("0.01")


def uid(*partes: object) -> str:
    return str(uuid.uuid5(NS, ":".join(str(p) for p in partes)))


def dec(v) -> Decimal:
    return Decimal(str(v or 0)).quantize(CENT, ROUND_HALF_UP)


# ---------------------------------------------------------------------------
# Lectura del volcado MySQL
# ---------------------------------------------------------------------------
def leer_volcado(ruta: Path) -> dict[str, list[dict]]:
    src = ruta.read_text(encoding="utf-8").replace("\r", "")
    tablas: dict[str, list[dict]] = collections.defaultdict(list)
    for m in re.finditer(r"INSERT INTO `(\w+)` \(([^)]*)\) VALUES\s*", src):
        tabla, cols = m.group(1), [c.strip(" `") for c in m.group(2).split(",")]
        i = m.end()
        while True:
            while src[i] in " \t\n,":
                i += 1
            if src[i] == ";":
                break
            assert src[i] == "(", f"formato inesperado en {tabla}"
            i += 1
            valores: list = []
            while True:
                while src[i] in " \t\n":
                    i += 1
                if src[i] == "'":
                    i += 1
                    s = []
                    while True:
                        c = src[i]
                        if c == "\\":
                            s.append({"n": "\n", "r": "\r", "t": "\t", "0": "\0"}.get(src[i + 1], src[i + 1]))
                            i += 2
                        elif c == "'" and src[i + 1] == "'":
                            s.append("'")
                            i += 2
                        elif c == "'":
                            i += 1
                            break
                        else:
                            s.append(c)
                            i += 1
                    valores.append("".join(s))
                else:
                    j = i
                    while src[j] not in ",)":
                        j += 1
                    tok = src[i:j].strip()
                    i = j
                    valores.append(None if tok == "NULL" else (Decimal(tok) if "." in tok else int(tok)))
                while src[i] in " \t\n":
                    i += 1
                if src[i] == ",":
                    i += 1
                    continue
                if src[i] == ")":
                    i += 1
                    break
            tablas[tabla].append(dict(zip(cols, valores)))
    return tablas


# ---------------------------------------------------------------------------
# Generación de SQL
# ---------------------------------------------------------------------------
def q(v) -> str:
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, Decimal)):
        return str(v)
    if isinstance(v, date):
        return f"'{v.isoformat()}'"
    return "'" + str(v).replace("'", "''") + "'"


def insert(tabla: str, filas: list[dict], conflicto: str = "do nothing") -> str:
    if not filas:
        return ""
    cols = list(filas[0].keys())
    valores = ",\n".join("  (" + ", ".join(q(f[c]) for c in cols) + ")" for f in filas)
    return f"insert into public.{tabla} ({', '.join(cols)}) values\n{valores}\non conflict {conflicto};\n\n"


def num(v) -> str:
    """Número sin ceros sobrantes ni notación científica: 20.000 → '20', 76.10 → '76.1'."""
    t = f"{Decimal(str(v)):f}"
    return t.rstrip("0").rstrip(".") if "." in t else t


def limpiar_telefono(t: str) -> str | None:
    dig = re.sub(r"\D", "", t or "")
    if len(dig) == 11 and dig.startswith("51"):
        dig = dig[2:]
    return dig or None


def frecuencia(v: str) -> str:
    return {"diario": "DIARIO", "semanal": "SEMANAL", "quincenal": "QUINCENAL", "mensual": "MENSUAL"}[v.strip().lower()]


def metodo(v: str | None) -> str:
    return {"efectivo": "EFECTIVO", "yape": "YAPE", "plin": "PLIN", "transferencia": "TRANSFERENCIA"}.get(
        (v or "").strip().lower(), "OTRO" if v else "EFECTIVO"
    )


MARCAS = {"iphone": "Apple", "xiomi": "Xiaomi", "xiaomi redmi": "Xiaomi", "hona": "Honda", "honda motokar": "Honda"}


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    entrada = Path(sys.argv[1])
    salida = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).parent / ".legado" / "legado.sql"
    d = leer_volcado(entrada)
    avisos: list[str] = []
    stats = collections.Counter()

    # ---------------- Clientes ----------------
    correos = collections.Counter(c["email"].strip().lower() for c in d["users_client"])
    clientes = []
    for c in d["users_client"]:
        doc = c["dni"].strip()
        email = c["email"].strip().lower()
        domicilio = (c["domicilio"] or "").strip()
        solo_distrito = re.fullmatch(r"santa anita(,\s*lima)?", domicilio, re.I) is not None
        doc_valido = re.fullmatch(r"\d{8}", doc) is not None
        email_valido = "@" in email and correos[email] == 1
        incompleto = not doc_valido or not email_valido or solo_distrito or len(domicilio) < 5
        clientes.append({
            "id": uid("cliente", c["id"]),
            "nombres": c["nombres"].strip(),
            "apellidos": c["apellidos"].strip(),
            "tipo_documento": "DNI",
            "numero_documento": doc if doc not in ("", ".") else f"SIN-DOC-{c['id']}",
            "telefono": limpiar_telefono(c["telefono"]),
            "email": email if email_valido else None,
            "direccion": None if solo_distrito or len(domicilio) < 5 else domicilio,
            "distrito": "Santa Anita" if solo_distrito else None,
            "provincia": "Lima" if solo_distrito else None,
            "departamento": "Lima" if solo_distrito else None,
            "legado_id": c["id"],
            "datos_incompletos": incompleto,
        })
        stats["clientes_incompletos"] += incompleto

    # ---------------- Unidades ----------------
    vehiculos = []
    for m in d["inventory_moto"]:
        marca_raw = m["marca"].strip()
        es_motokar = "motokar" in (marca_raw + " " + m["modelo"]).lower()
        vehiculos.append({
            "id": uid("vehiculo", m["id"]),
            "tipo_vehiculo": "TRIMOVIL_PASAJEROS" if es_motokar else "MOTO_LINEAL",
            "marca": MARCAS.get(marca_raw.lower(), marca_raw.title()),
            "modelo": "Motokar GL150" if es_motokar else m["modelo"].strip().title(),
            "anio": m["anio"],
            "color": (m["color"] or "").strip() or None,
            "condicion": "NUEVO" if m["condicion"].lower() == "0km" else "USADO",
            "precio_lista": dec(m["precio"]),
            "numero_motor": m["numero_motor"].strip(),
            "numero_chasis": m["numero_serie"].strip(),
            "placa": (m["placa"] or "").strip() or None,
            "estado": "EN_STOCK" if m["estado"].lower() == "disponible" else "VENDIDO_CONTADO",
            "legado_id": m["id"],
        })

    ventas_por_equipo = {s["device_id"]: s for s in d["devices_devicesale"]}
    celulares = []
    for x in d["devices_device"]:
        venta = ventas_por_equipo.get(x["id"])
        marca_raw = x["marca"].strip()
        marca = MARCAS.get(marca_raw.lower(), marca_raw.title())
        modelo = x["modelo"].strip()
        if marca_raw.lower() == "iphone":
            modelo = f"iPhone {modelo}".replace(" pro", " Pro")
        elif marca_raw.lower() == "xiaomi redmi":
            modelo = f"Redmi {modelo}"
        icloud = (venta or {}).get("icloud_email")
        so = (venta or {}).get("sistema_operativo") or ("IOS" if marca == "Apple" else "ANDROID")
        if len(x["imei"]) != 15:
            avisos.append(f"Celular legado #{x['id']}: IMEI1 con {len(x['imei'])} dígitos (se importa igual, revisar)")
        celulares.append({
            "id": uid("celular", x["id"]),
            "marca": marca,
            "modelo": modelo,
            "color": (x["color"] or "").strip() or None,
            "sistema_operativo": so.upper(),
            "precio_lista": dec(x["precio"]),
            "imei1": x["imei"].strip(),
            "imei2": (x["imei2"] or "").strip() or None,
            "numero_serie": (x["numero_serie"] or "").strip() or None,
            "plataforma_bloqueo": "ICLOUD" if icloud else "NINGUNA",
            "id_enrolamiento": icloud or None,
            "estado_bloqueo": "LIBERADO_DEFINITIVO" if venta and venta["estado"].lower() == "pagado" else "DESBLOQUEADO_OPERATIVO",
            "estado": "VENDIDO_CREDITO" if x["estado"].lower() == "vendido" else "EN_STOCK",
            "legado_id": x["id"],
        })
    stats["icloud_password_omitidas"] = sum(1 for s in d["devices_devicesale"] if s.get("icloud_password"))

    # ---------------- Créditos, cuotas y pagos ----------------
    creditos, cuotas, pagos, aplicaciones = [], [], [], []
    hoy = date.today()

    def agregar_credito(origen: str, cab: dict, tipo: str, filas_cuota: list[dict], *, monto_total: Decimal,
                        inicial: Decimal, fecha_inicio: str, frec: str, unidad_celular: str | None):
        filas_cuota = sorted(filas_cuota, key=lambda r: r["numero"])
        financiado = monto_total - inicial
        total_cuotas = sum((dec(r["monto"]) for r in filas_cuota), Decimal(0))
        total_cab = dec(cab["monto_total_deuda"])
        if abs(total_cuotas - total_cab) > Decimal("0.10"):
            avisos.append(f"{origen} #{cab['id']}: cabecera S/ {total_cab} ≠ cronograma S/ {total_cuotas} → se usa el cronograma")
            stats["cabeceras_corregidas"] += 1
        intereses = max(total_cuotas - financiado, Decimal(0))
        total_pagar = financiado + intereses
        tasa = (intereses / financiado * 100).quantize(Decimal("0.001"), ROUND_HALF_UP) if financiado else Decimal(0)
        cid = uid("credito", origen, cab["id"])
        todo_pagado = all(r["pagado"] for r in filas_cuota)
        estado = "FINALIZADO_LIQUIDADO" if todo_pagado else "VIGENTE"
        ultima = max((r["fecha_pago"] for r in filas_cuota if r["fecha_pago"]), default=None)
        nota = f"Migrado del sistema anterior ({origen} #{cab['id']})."
        if abs(tasa - dec(cab["interes"])) > Decimal("0.5"):
            nota += f" La cabecera original indicaba {num(cab['interes'])} % de interés; el cronograma cobrado equivale a {num(tasa)} %."
        creditos.append({
            "id": cid,
            "codigo": f"JP-{'PE' if tipo == 'PRESTAMO_EFECTIVO' else 'CC'}-L{cab['id']:05d}",
            "tipo": tipo,
            "cliente_id": uid("cliente", cab["cliente_id"]),
            "unidad_celular_id": unidad_celular,
            "monto_total": monto_total,
            "cuota_inicial": inicial,
            "tasa_porcentaje": tasa,
            "tipo_calculo": "FLAT",
            "total_intereses": intereses,
            "monto_total_pagar": total_pagar,
            "frecuencia": frec,
            "numero_cuotas": len(filas_cuota),
            "valor_cuota": dec(cab["monto_cuota"]) or dec(filas_cuota[0]["monto"]),
            "fecha_desembolso": fecha_inicio,
            "fecha_primer_vencimiento": filas_cuota[0]["fecha_vencimiento"],
            "fecha_cancelacion": ultima if todo_pagado else None,
            "estado": estado,
            "notas": nota,
            "legado_origen": origen,
            "legado_id": cab["id"],
        })
        # Reparto capital / interés proporcional (FLAT), ajustando el redondeo en la última cuota
        capital_restante = financiado
        for k, r in enumerate(filas_cuota):
            monto = dec(r["monto"])
            if k == len(filas_cuota) - 1:
                capital = capital_restante
            else:
                capital = (monto * financiado / total_cuotas).quantize(CENT, ROUND_HALF_UP) if total_cuotas else Decimal(0)
            capital = max(min(capital, monto), Decimal(0))
            interes = monto - capital
            capital_restante -= capital
            pagado_monto = dec(r["monto_pagado"])
            exceso = max(pagado_monto - monto, Decimal(0))
            if r["pagado"]:
                est = "PAGADA"
            elif pagado_monto > 0:
                est = "PAGADA_PARCIAL"
            else:
                est = "PENDIENTE"
            qid = uid("cuota", origen, r["id"])
            cuotas.append({
                "id": qid,
                "credito_id": cid,
                "numero": r["numero"],
                "fecha_vencimiento": r["fecha_vencimiento"],
                "monto_cuota": monto,
                "capital": capital,
                "interes": interes,
                "mora": exceso,
                "monto_pagado": pagado_monto,
                "saldo_capital": max(capital_restante, Decimal(0)),
                "fecha_pago": r["fecha_pago"] if r["pagado"] else None,
                "estado": est,
                "legado_id": r["id"],
            })
            if pagado_monto > 0:
                if exceso > 0:
                    stats["cuotas_con_excedente"] += 1
                pid = uid("pago", origen, r["id"])
                pagos.append({
                    "id": pid,
                    "credito_id": cid,
                    "monto": pagado_monto,
                    "metodo": metodo(r.get("metodo_pago")),
                    "fecha_pago": r["fecha_pago"] or r["fecha_vencimiento"],
                    "notas": "Pago migrado del sistema anterior" + (f"; incluye S/ {exceso} por encima de la cuota (registrado como mora)" if exceso else ""),
                })
                cubierto = min(pagado_monto, monto)
                a_interes = min(cubierto, interes)
                aplicaciones.append({
                    "id": uid("aplicacion", origen, r["id"]),
                    "pago_id": pid,
                    "cuota_id": qid,
                    "mora": exceso,
                    "interes": a_interes,
                    "capital": cubierto - a_interes,
                })

    cuotas_prestamo = collections.defaultdict(list)
    for r in d["loans_cuotaprestamo"]:
        cuotas_prestamo[r["prestamo_id"]].append(r)
    for p in d["loans_prestamo"]:
        agregar_credito("loans_prestamo", p, "PRESTAMO_EFECTIVO", cuotas_prestamo[p["id"]],
                        monto_total=dec(p["monto_prestado"]), inicial=Decimal(0),
                        fecha_inicio=p["fecha_inicio"], frec=frecuencia(p["frecuencia"]), unidad_celular=None)

    precio_equipo = {x["id"]: dec(x["precio"]) for x in d["devices_device"]}
    cuotas_venta = collections.defaultdict(list)
    for r in d["devices_deviceinstallment"]:
        cuotas_venta[r["sale_id"]].append(r)
    for s in d["devices_devicesale"]:
        agregar_credito("devices_devicesale", s, "CREDITO_CELULAR", cuotas_venta[s["id"]],
                        monto_total=precio_equipo[s["device_id"]], inicial=dec(s["monto_inicial"]),
                        fecha_inicio=s["fecha_venta"], frec=frecuencia(s["metodo_pago"] or "Semanal"),
                        unidad_celular=uid("celular", s["device_id"]))

    # ---------------- Escribir SQL ----------------
    partes = [
        "-- Generado por database/importar_legado.py — CONTIENE DATOS PERSONALES, no subir a git.\n",
        f"-- Origen: {entrada.name} · generado el {hoy.isoformat()}\n\n",
        "begin;\n\n",
        # Evitar miles de filas de auditoría y el cambio automático de estado de unidades durante la carga
        "alter table public.credito disable trigger credito_auditoria;\n",
        "alter table public.credito disable trigger credito_estado_unidad;\n",
        "alter table public.pago disable trigger pago_auditoria;\n\n",
        insert("cliente", clientes),
        insert("unidad_vehiculo", vehiculos),
        insert("unidad_celular", celulares),
        insert("credito", creditos),
        insert("cuota", cuotas),
        insert("pago", pagos),
        insert("aplicacion_pago", aplicaciones),
        "alter table public.credito enable trigger credito_auditoria;\n",
        "alter table public.credito enable trigger credito_estado_unidad;\n",
        "alter table public.pago enable trigger pago_auditoria;\n\n",
        "-- Recalcular moras, estados de crédito y perfil de cada cliente\n",
        "select * from public.recalcular_estados();\n\n",
        "insert into public.audit_log (tabla, registro_id, accion, despues)\n",
        f"values ('importacion', 'legado', 'INSERT', {q(json.dumps({'clientes': len(clientes), 'creditos': len(creditos), 'cuotas': len(cuotas), 'pagos': len(pagos)}))}::jsonb);\n\n",
        "commit;\n",
    ]
    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text("".join(partes), encoding="utf-8")

    print(f"SQL generado en {salida}")
    print(f"  clientes: {len(clientes)}  (con datos incompletos: {stats['clientes_incompletos']})")
    print(f"  vehículos: {len(vehiculos)}  celulares: {len(celulares)}")
    print(f"  créditos: {len(creditos)}  cuotas: {len(cuotas)}  pagos: {len(pagos)}")
    print(f"  cabeceras corregidas por cronograma: {stats['cabeceras_corregidas']}")
    print(f"  cuotas pagadas con excedente (registrado como mora): {stats['cuotas_con_excedente']}")
    print(f"  contraseñas iCloud omitidas: {stats['icloud_password_omitidas']}")
    for a in avisos:
        if "cabecera" not in a:
            print("  aviso:", a)


if __name__ == "__main__":
    main()
