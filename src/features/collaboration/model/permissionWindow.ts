const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * Convierte el valor de un `<input type="datetime-local">` (hora local del navegador) al instante
 * ISO que acepta el contrato. Devuelve `null` para vacio o invalido: el formulario distingue ambos
 * casos mirando el valor crudo.
 */
export function localDateTimeToInstant(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = LOCAL_DATE_TIME.exec(trimmed);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day) ||
    date.getHours() !== Number(hour) ||
    date.getMinutes() !== Number(minute)
  )
    return null;
  return date.toISOString();
}

export type PermissionWindow = { validFrom: string | null; validUntil: string | null };

/**
 * Validacion local de una ventana de concesion. El backend sigue siendo la autoridad: ademas
 * comprueba que la ventana quepa en la del propio delegador, algo que el frontend no puede
 * resolver con certeza cuando hay varias concesiones.
 */
export function validatePermissionWindow(
  window: PermissionWindow,
  now = Date.now(),
): string | null {
  const from = window.validFrom === null ? null : Date.parse(window.validFrom);
  const until = window.validUntil === null ? null : Date.parse(window.validUntil);
  if (from !== null && !Number.isFinite(from))
    return "El inicio de vigencia no es una fecha válida.";
  if (until !== null && !Number.isFinite(until))
    return "El fin de vigencia no es una fecha válida.";
  if (from !== null && until !== null && until <= from)
    return "El fin de vigencia debe ser posterior al inicio.";
  if (until !== null && until <= now)
    return "El fin de vigencia debe ser futuro; una concesión vencida no se mostraría.";
  return null;
}
