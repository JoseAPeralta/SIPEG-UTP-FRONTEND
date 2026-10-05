import {
  institutionalUnitsByCode,
  type OrganizationalUnitCode,
} from "@/features/organizational-units/model/unitRegistry";
import type { ActivityType } from "@/types/domain";

/**
 * Fuente unica de verdad para los colores de identidad por unidad organizativa
 * (facultades y subdirecciones) y por tipo de actividad.
 *
 * Los colores base de las facultades provienen de la paleta oficial de la UTP
 * (https://utp.ac.pa/paleta-de-colores) y se recibieron en RGB:
 *
 * | Facultad                              | Codigo | RGB          |
 * | ------------------------------------- | ------ | ------------ |
 * | Facultad de Ingenieria Civil          | FIC    | 89, 0, 92    |
 * | Facultad de Ingenieria Electrica      | FIE    | 0, 153, 230  |
 * | Facultad de Ingenieria Industrial     | FII    | 255, 208, 0  |
 * | Facultad de Ingenieria Mecanica       | FIM    | 103, 0, 50   |
 * | Facultad de Ingenieria Sistemas Comp. | FISC   | 0, 114, 46   |
 * | Facultad de Ciencias y Tecnologia     | FCYT   | 255, 126, 0  |
 *
 * Las subdirecciones no tienen color oficial: usan una familia desaturada
 * propia para leerse como grupo administrativo sin competir con las facultades.
 *
 * Cada token expone:
 * - `base`: color representativo (RGB oficial o propuesta).
 * - `bg`/`fg`: fondo y texto del badge en modo claro.
 * - `darkBg`/`darkFg`: fondo y texto del badge en modo oscuro.
 *
 * `bg` es una mezcla del color base sobre la superficie del tema (14% claro,
 * 24% oscuro) y `fg` es el base oscurecido (claro) o aclarado (oscuro) hasta
 * cumplir contraste AA (>= 4.5:1) sobre `bg`.
 */

/**
 * Clave de token de color por unidad.
 *
 * Las claves son `camelCase` a proposito, no los codigos institucionales:
 * los badges las leen con `unit.bg.${key}` y una clave con guion (como
 * `SUB-ACAD`) romperia el acceso por punto. La union con los codigos la
 * garantiza `unitColorKeyByCode`, que es exhaustivo sobre el registro.
 */
export type UnitColorKey =
  | "default"
  | "fcyt"
  | "fic"
  | "fie"
  | "fii"
  | "fim"
  | "fisc"
  | "subAcad"
  | "subAdmin"
  | "subIpe"
  | "subVida";

export type ActivityTypeColorKey =
  "competition" | "conference" | "course" | "other" | "panel" | "seminar" | "talk" | "workshop";

export type DomainColorToken = {
  base: string;
  bg: string;
  darkBg: string;
  darkFg: string;
  fg: string;
};

export const unitColorTokens: Record<UnitColorKey, DomainColorToken> = {
  default: { base: "#9C3A1E", bg: "#FBF0EA", darkBg: "#3B1D13", darkFg: "#F35A2F", fg: "#7E2F18" },
  fcyt: { base: "#FF7E00", bg: "#FCE6D0", darkBg: "#522D0C", darkFg: "#FF7E00", fg: "#A35100" },
  fic: { base: "#59005C", bg: "#E4D4DD", darkBg: "#2B0F22", darkFg: "#E400EC", fg: "#59005C" },
  fie: { base: "#0099E6", bg: "#D8EAF0", darkBg: "#153443", darkFg: "#00A5F8", fg: "#006BA1" },
  fii: { base: "#FFD000", bg: "#FCF2D0", darkBg: "#52410C", darkFg: "#FFD000", fg: "#856C00" },
  fim: { base: "#670032", bg: "#E6D4D7", darkBg: "#2E0F18", darkFg: "#FF007C", fg: "#670032" },
  fisc: { base: "#00722E", bg: "#D8E4D7", darkBg: "#152B17", darkFg: "#00A442", fg: "#00722E" },
  subAcad: { base: "#4E6E6A", bg: "#E3E4DF", darkBg: "#282A26", darkFg: "#6D9A94", fg: "#4B6A66" },
  subAdmin: { base: "#566072", bg: "#E4E2E0", darkBg: "#2A2628", darkFg: "#7F8EA9", fg: "#566072" },
  subIpe: { base: "#7A5568", bg: "#E9E0DF", darkBg: "#332425", darkFg: "#B57E9A", fg: "#7A5568" },
  subVida: { base: "#6B7A4B", bg: "#E7E6DB", darkBg: "#2F2C1E", darkFg: "#899C60", fg: "#5E6B42" },
};

export const activityTypeColorTokens: Record<ActivityTypeColorKey, DomainColorToken> = {
  competition: {
    base: "#8A4A00",
    bg: "#EBDFD0",
    darkBg: "#36210C",
    darkFg: "#D77300",
    fg: "#8A4A00",
  },
  conference: {
    base: "#7A1F6B",
    bg: "#E9D9DF",
    darkBg: "#331726",
    darkFg: "#D454BF",
    fg: "#7A1F6B",
  },
  course: { base: "#4F6B1F", bg: "#E3E3D4", darkBg: "#282914", darkFg: "#729A2D", fg: "#4F6B1F" },
  other: { base: "#6E5F55", bg: "#E7E2DC", darkBg: "#302621", darkFg: "#A38D7E", fg: "#6E5F55" },
  panel: { base: "#1F5C8A", bg: "#DCE1E3", darkBg: "#1D252D", darkFg: "#3C92D3", fg: "#1F5C8A" },
  seminar: { base: "#3B4C9B", bg: "#E0DFE6", darkBg: "#232131", darkFg: "#6380FF", fg: "#3B4C9B" },
  talk: { base: "#0E6E6E", bg: "#DAE4E0", darkBg: "#192A27", darkFg: "#149E9E", fg: "#0E6E6E" },
  workshop: { base: "#9C3A1E", bg: "#EEDDD4", darkBg: "#3B1D13", darkFg: "#F35A2F", fg: "#9C3A1E" },
};

/**
 * Une cada codigo institucional con su token de color.
 *
 * Es un `Record` sobre `OrganizationalUnitCode`, de modo que agregar una unidad
 * al registro sin decidirle un color rompe la compilacion. Ningun valor es
 * `default`: `default` es solo para codigos que el backend aun no conoce.
 */
const unitColorKeyByCode: Record<OrganizationalUnitCode, Exclude<UnitColorKey, "default">> = {
  FCYT: "fcyt",
  FIC: "fic",
  FIE: "fie",
  FII: "fii",
  FIM: "fim",
  FISC: "fisc",
  "SUB-ACAD": "subAcad",
  "SUB-ADMIN": "subAdmin",
  "SUB-IPE": "subIpe",
  "SUB-VIDA": "subVida",
};

const activityTypeToColorKey: Record<ActivityType, ActivityTypeColorKey> = {
  COMPETITION: "competition",
  CONFERENCE: "conference",
  COURSE: "course",
  OTHER: "other",
  PANEL: "panel",
  SEMINAR: "seminar",
  TALK: "talk",
  WORKSHOP: "workshop",
};

/**
 * Resolves the color token key for an organizational unit by its institutional code.
 *
 * A code outside the registry (a faculty the backend added without a frontend
 * change) degrades to the `default` token instead of throwing: the agenda must
 * still render. `null` is the public agenda's way of saying "this activity's
 * unit is not in the registry", and it degrades the same way.
 */
export function getUnitColorKey(code: string | null | undefined): UnitColorKey {
  if (!code) {
    return "default";
  }

  // `noUncheckedIndexedAccess` no esta activo, asi que el indice se declara como
  // presente aunque el Record sea exhaustivo. La busqueda se hace sobre las
  // claves reales para que un codigo desconocido degrade de verdad, que es lo
  // que evita romper la agenda cuando el backend agrega una facultad.
  const normalized = code.trim().toUpperCase();
  const resolved = Object.hasOwn(unitColorKeyByCode, normalized)
    ? unitColorKeyByCode[normalized as OrganizationalUnitCode]
    : undefined;

  return resolved ?? "default";
}

/** Every code the theme can paint, used to assert the registry and the theme agree. */
export function knownUnitCodes(): readonly OrganizationalUnitCode[] {
  return Object.keys(institutionalUnitsByCode) as OrganizationalUnitCode[];
}

/** Resolves the color token key for an activity type. */
export function getActivityTypeColorKey(type: ActivityType): ActivityTypeColorKey {
  return activityTypeToColorKey[type];
}
