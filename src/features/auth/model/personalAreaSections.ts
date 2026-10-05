export type PersonalAreaSectionId = "actividades" | "certificados" | "datos" | "seguridad";

export type PersonalAreaSection = {
  description: string;
  id: PersonalAreaSectionId;
  label: string;
  path: string;
};

const SECTIONS: Record<PersonalAreaSectionId, PersonalAreaSection> = {
  datos: {
    description:
      "Consulte y actualice los datos de su cuenta que SIPEG le permite cambiar. El correo, la cedula y el rol los administra SIPEG.",
    id: "datos",
    label: "Datos de la cuenta",
    path: "/perfil/datos",
  },
  seguridad: {
    description: "Cambie la contrasena de su sesion vigente y revise la seguridad de su cuenta.",
    id: "seguridad",
    label: "Seguridad de la cuenta",
    path: "/perfil/seguridad",
  },
  actividades: {
    description:
      "Consulte sus inscripciones, el estado de su asistencia y el codigo de acceso de cada actividad.",
    id: "actividades",
    label: "Mis actividades",
    path: "/perfil/actividades",
  },
  certificados: {
    description:
      "Consulte y descargue los certificados de las actividades en las que su asistencia fue confirmada.",
    id: "certificados",
    label: "Mis certificados",
    path: "/perfil/certificados",
  },
};

/** Orden de navegacion del submenu. El orden de claves de `SECTIONS` es el orden de la interfaz. */
export const PERSONAL_AREA_SECTIONS: readonly PersonalAreaSection[] = Object.values(SECTIONS);

const DEFAULT_SECTION_ID: PersonalAreaSectionId = "datos";

/**
 * Resuelve la seccion activa a partir de la ruta. Una ruta desconocida, incluido el alias `/perfil`,
 * cae en la seccion de datos, de modo que el submenu nunca queda sin seccion marcada.
 */
export function resolvePersonalAreaSection(pathname: string): PersonalAreaSection {
  return (
    PERSONAL_AREA_SECTIONS.find((section) => section.path === pathname) ??
    SECTIONS[DEFAULT_SECTION_ID]
  );
}
