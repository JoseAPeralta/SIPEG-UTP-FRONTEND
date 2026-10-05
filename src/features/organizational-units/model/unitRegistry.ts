import type { OrganizationalUnitType } from "@/types/domain";

/**
 * Registro institucional de las unidades organizativas de la UTP.
 *
 * Es la fuente unica de verdad del **codigo** y del **nombre** de cada
 * unidad en el frontend. Se declara aqui, y no se pide al API, por dos
 * razones:
 *
 * 1. No cambia con frecuencia. Son diez unidades y sus codigos son
 *    institutionales, no datos de negocio. Pedirlas en cada carga de la
 *    agenda publica suma una solicitud por un dato que ya se conoce.
 * 2. El listado publico de actividades (`ActivityOrganizationalUnit` en el
 *    contrato) devuelve `id`, `name` y `type`, pero **no** devuelve `code`.
 *    El codigo es justamente lo que el tema y los badges necesitan
 *    (`getUnitColorKey`), asi que sin este registro no habria forma de
 *    unir una actividad con su color sin una segunda consulta.
 *
 * `ORGANIZATIONAL_UNIT_CODES` es una tupla const, y `institutionalUnitsByCode`
 * es un `Record` sobre ella: agregar un codigo aqui sin su ficha rompe la
 * compilacion, y dejar una ficha sin su codigo tambien. Las dos mitades no
 * pueden desincronizarse.
 *
 * Invariante de union: una actividad se une a su unidad por `name`, porque el
 * listado publico no trae `code`. Si el backend renombra una unidad, el nombre
 * deja de coincidir y `findInstitutionalUnitByName` devuelve `null`; el
 * filtro por unidad dejara de considerarla, pero la actividad se sigue
 * pintando con el color por defecto. Es degradar, no romper.
 */

/** Codigo institucional de una unidad organizativa. */
export const ORGANIZATIONAL_UNIT_CODES = [
  "FCYT",
  "FIC",
  "FIE",
  "FII",
  "FIM",
  "FISC",
  "SUB-ACAD",
  "SUB-ADMIN",
  "SUB-IPE",
  "SUB-VIDA",
] as const;

export type OrganizationalUnitCode = (typeof ORGANIZATIONAL_UNIT_CODES)[number];

/**
 * Ficha minima de una unidad: lo unico que la UI necesita para etiquetar y
 * colorear. Deliberadamente no extiende `OrganizationalUnit`, porque aqui no
 * hay `id`, `head`, `description` ni `isActive`: el registro no es una entidad
 * del dominio, es una tabla de referencias.
 */
export type InstitutionalUnit = {
  readonly code: OrganizationalUnitCode;
  readonly label: string;
  readonly type: OrganizationalUnitType;
};

export const institutionalUnitsByCode: Record<OrganizationalUnitCode, InstitutionalUnit> = {
  FCYT: { code: "FCYT", label: "Facultad de Ciencias y Tecnología", type: "FACULTY" },
  FIC: { code: "FIC", label: "Facultad de Ingeniería Civil", type: "FACULTY" },
  FIE: { code: "FIE", label: "Facultad de Ingeniería Eléctrica", type: "FACULTY" },
  FII: { code: "FII", label: "Facultad de Ingeniería Industrial", type: "FACULTY" },
  FIM: { code: "FIM", label: "Facultad de Ingeniería Mecánica", type: "FACULTY" },
  FISC: {
    code: "FISC",
    label: "Facultad de Ingeniería de Sistemas Computacionales",
    type: "FACULTY",
  },
  "SUB-ACAD": { code: "SUB-ACAD", label: "Subdirección Académica", type: "SUBDIRECTORATE" },
  "SUB-ADMIN": {
    code: "SUB-ADMIN",
    label: "Subdirección Administrativa",
    type: "SUBDIRECTORATE",
  },
  "SUB-IPE": {
    code: "SUB-IPE",
    label: "Subdirección de Investigación, Postgrado y Extensión",
    type: "SUBDIRECTORATE",
  },
  "SUB-VIDA": {
    code: "SUB-VIDA",
    label: "Subdirección de Vida Universitaria",
    type: "SUBDIRECTORATE",
  },
};

export const institutionalUnits: readonly InstitutionalUnit[] = ORGANIZATIONAL_UNIT_CODES.map(
  (code) => institutionalUnitsByCode[code],
);

/**
 * Reduce un nombre a una forma comparable: minusculas, sin diacriticos y sin
 * espacios redundantes.
 *
 * El listado publico entrega el nombre de la unidad como texto libre y el
 * frontend lo declara con su acentuacion propia. Comparar en crudo haria fallar
 * la union ante una sola tilde discrepante, y el sintoma seria una actividad sin
 * color y ausente del filtro. Normalizar hace que la union dependa del nombre y
 * no de como se escribio.
 */
function normalizeName(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
}

const unitsByNormalizedName = new Map(
  institutionalUnits.map((unit) => [normalizeName(unit.label), unit]),
);

/**
 * Resuelve la ficha institucional a partir del nombre que trae el contrato.
 *
 * El nombre es la unica llave compartida con el listado publico de actividades,
 * porque ese item no expone el codigo. Devuelve `null` ante un nombre
 * desconocido para que quien llame decida como degradar, en vez de recibir una
 * ficha inventada.
 */
export function findInstitutionalUnitByName(name: string): InstitutionalUnit | null {
  return unitsByNormalizedName.get(normalizeName(name)) ?? null;
}

/** Opciones de filtro por unidad, ya ordenadas como las declara el registro. */
export function institutionalUnitFilterOptions(): { id: OrganizationalUnitCode; label: string }[] {
  return institutionalUnits.map((unit) => ({
    id: unit.code,
    label: `${unit.code} - ${unit.label}`,
  }));
}
