import { describe, expect, it } from "vitest";

import { PERSONAL_AREA_SECTIONS, resolvePersonalAreaSection } from "./personalAreaSections";

describe("personalAreaSections", () => {
  it("declarar las cuatro secciones en el orden del submenu", () => {
    expect(PERSONAL_AREA_SECTIONS.map((section) => section.id)).toEqual([
      "datos",
      "seguridad",
      "actividades",
      "certificados",
    ]);
  });

  it("resuelve cada ruta canonica con su propia seccion", () => {
    expect(resolvePersonalAreaSection("/perfil/datos").id).toBe("datos");
    expect(resolvePersonalAreaSection("/perfil/seguridad").id).toBe("seguridad");
    expect(resolvePersonalAreaSection("/perfil/actividades").id).toBe("actividades");
    expect(resolvePersonalAreaSection("/perfil/certificados").id).toBe("certificados");
  });

  it("usa nombres de producto completos y no codigos de ruta", () => {
    expect(PERSONAL_AREA_SECTIONS.map((section) => section.label)).toEqual([
      "Datos de la cuenta",
      "Seguridad de la cuenta",
      "Mis actividades",
      "Mis certificados",
    ]);
  });

  it("resuelve los alias a la seccion de datos en lugar de fallar", () => {
    expect(resolvePersonalAreaSection("/perfil").id).toBe("datos");
    expect(resolvePersonalAreaSection("/cambiar-contrasena").id).toBe("datos");
    expect(resolvePersonalAreaSection("/otra-ruta").id).toBe("datos");
  });
});
