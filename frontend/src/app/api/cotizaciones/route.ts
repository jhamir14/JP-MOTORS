import { NextResponse } from "next/server";
import { cotizacionSchema, cotizar, mensajeWhatsAppCotizacion, reglasCotizacion } from "@/lib/cotizacion";
import { correoConfigurado, destinoAvisos, enviarCorreo } from "@/lib/server/correo";
import { correoAvisoInterno, correoCotizacionCliente, type DatosCotizacion } from "@/lib/server/correosCotizacion";
import { obtenerCatalogo, obtenerTasasPublicas } from "@/lib/server/catalogo";
import { dbConfigurada, sql } from "@/lib/server/db";
import { ipDe, permitirIntentoCompartido } from "@/lib/server/limite";
import { servicioDeProducto } from "@/lib/catalogo";
import { whatsappDeArea } from "@/lib/whatsapp";
import { erroresPorCampo } from "@/schemas/solicitudCredito";

/**
 * Cotizador de la web. Recalcula la cuota con los datos del servidor y:
 *   1. guarda la cotización en solicitud_credito (aparece en Panel → Solicitudes);
 *   2. avisa por correo al buzón de la empresa;
 *   3. si el cliente dejó correo, le envía una copia de su cotización.
 * Basta con que 1 o 2 funcione para no perder el contacto.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!(await permitirIntentoCompartido(`cotizacion:${ipDe(request.headers)}`, 6, 60 * 60 * 1000))) {
    return NextResponse.json({ ok: false, error: "Hiciste varias cotizaciones seguidas. Escríbenos por WhatsApp y te atendemos." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida" }, { status: 400 });
  }
  // Honeypot anti-spam: un humano nunca llena este campo oculto.
  if (typeof body === "object" && body && (body as Record<string, unknown>).empresa_web) return NextResponse.json({ ok: true });

  const parsed = cotizacionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, errors: erroresPorCampo(parsed.error) }, { status: 422 });
  const f = parsed.data;

  const [catalogo, tasas] = await Promise.all([obtenerCatalogo(), obtenerTasasPublicas()]);
  const producto = catalogo.find((p) => p.slug === f.productoSlug);
  if (!producto) return NextResponse.json({ ok: false, error: "Ese modelo ya no está en el catálogo." }, { status: 422 });
  const resultado = cotizar(producto, reglasCotizacion(producto, tasas), f);
  if (!resultado) return NextResponse.json({ ok: false, error: "Revisa la inicial y el plazo e inténtalo de nuevo." }, { status: 422 });

  const correo = correoConfigurado();
  if (!dbConfigurada && !correo) {
    console.error("[cotizaciones] Sin canal: configura DATABASE_URL y/o SMTP_PASSWORD");
    return NextResponse.json({ ok: false, error: "Servicio no disponible. Escríbenos por WhatsApp." }, { status: 503 });
  }

  const datos: DatosCotizacion = {
    nombre: f.nombre,
    celular: f.celular,
    correo: f.correo,
    producto: { nombre: producto.nombre, slug: producto.slug, imagen: producto.imagenes[0]?.url },
    resultado,
    whatsappAsesor: whatsappDeArea(producto),
  };

  const guardar = async () => {
    const db = sql();
    const [fila] = await db<{ id: string }[]>`
      insert into public.solicitud_credito ${db({
        servicio: servicioDeProducto(producto),
        producto_id: UUID.test(producto.id) ? producto.id : null,
        producto_interes: producto.nombre,
        nombres: f.nombre,
        apellidos: "",
        numero_documento: "",
        celular: f.celular,
        email: f.correo || null,
        preferencia_contacto: "WhatsApp",
        monto_solicitado: producto.precio,
        cuota_inicial: resultado.inicial,
        datos_extra: db.json({
          tipo: "cotizacion",
          producto_slug: producto.slug,
          frecuencia: resultado.frecuencia,
          numero_cuotas: resultado.numeroCuotas,
          cuota: resultado.cuota,
          tasa_porcentaje: resultado.tasaPorcentaje,
          financiado: resultado.financiado,
          total_cuotas: resultado.totalCuotas,
          copia_enviada: false,
        }),
        acepta_datos: true,
        origen: "cotizador",
      })}
      returning id`;
    return fila.id;
  };

  const aviso = async () => {
    const c = correoAvisoInterno(datos);
    await enviarCorreo({ ...c, para: destinoAvisos() });
  };

  const [bd, avisoRes] = await Promise.allSettled([
    dbConfigurada ? guardar() : Promise.reject(new Error("omitido")),
    correo ? aviso() : Promise.reject(new Error("omitido")),
  ]);
  if (bd.status === "rejected" && dbConfigurada) console.error("[cotizaciones] No se pudo guardar:", bd.reason);
  if (avisoRes.status === "rejected" && correo) console.error("[cotizaciones] No se pudo enviar el aviso:", avisoRes.reason);
  if (bd.status === "rejected" && avisoRes.status === "rejected") {
    return NextResponse.json({ ok: false, error: "No pudimos registrar tu cotización. Escríbenos por WhatsApp." }, { status: 502 });
  }

  let copiaEnviada = false;
  if (correo && f.correo) {
    try {
      await enviarCorreo(correoCotizacionCliente(datos));
      copiaEnviada = true;
      if (bd.status === "fulfilled") {
        await sql()`
          update public.solicitud_credito
          set datos_extra = datos_extra || '{"copia_enviada": true}'::jsonb
          where id = ${bd.value}`.catch(() => undefined);
      }
    } catch (e) {
      console.error("[cotizaciones] No se pudo enviar la copia al cliente:", e);
    }
  }

  return NextResponse.json({ ok: true, copiaEnviada, mensajeWhatsApp: mensajeWhatsAppCotizacion(producto.nombre, resultado, f.nombre) });
}
