import type { AdminUser } from "@/features/users/model/adminUser";

/**
 * Cuentas de demostracion con las referencias institucionales embebidas que exige `AdminUser`.
 * Los nombres y codigos coinciden con los catalogos de `./careers` y `./organizationalUnits`,
 * porque la pantalla administrativa ya no consulta esos catalogos para etiquetar una fila.
 */
export const users: AdminUser[] = [
  {
    career: { code: "SOFTWARE", id: "software", name: "Desarrollo de Software" },
    email: "mariana.rodriguez@example.edu",
    firstName: "Mariana",
    globalRole: "ADMIN",
    id: "user-1",
    identificationNumber: "8-888-1234",
    isActive: true,
    lastName: "Rodriguez",
    unit: {
      code: "FISC",
      id: "fisc",
      name: "Facultad de Ingenieria de Sistemas Computacionales",
    },
  },
  {
    career: { code: "CIVIL", id: "civil", name: "Ingenieria Civil" },
    email: "carlos.mendez@example.edu",
    firstName: "Carlos",
    globalRole: "USER",
    id: "user-2",
    identificationNumber: "8-712-4455",
    isActive: true,
    lastName: "Mendez",
    unit: { code: "FIC", id: "fic", name: "Facultad de Ingenieria Civil" },
  },
  {
    career: { code: "ELECTRICAL", id: "electrical", name: "Ingenieria Electrica" },
    email: "laura.chen@example.edu",
    firstName: "Laura",
    globalRole: "USER",
    id: "user-3",
    identificationNumber: "8-655-9021",
    isActive: true,
    lastName: "Chen",
    unit: { code: "FIE", id: "fie", name: "Facultad de Ingenieria Electrica" },
  },
  {
    career: { code: "MECHANICAL", id: "mechanical", name: "Ingenieria Mecanica" },
    email: "jorge.santos@example.edu",
    firstName: "Jorge",
    globalRole: "USER",
    id: "user-4",
    identificationNumber: "8-590-3377",
    isActive: true,
    lastName: "Santos",
    unit: { code: "FIM", id: "fim", name: "Facultad de Ingenieria Mecanica" },
  },
  {
    career: null,
    email: "ana.torres@example.edu",
    firstName: "Ana",
    globalRole: "USER",
    id: "user-5",
    identificationNumber: "8-500-1188",
    isActive: false,
    lastName: "Torres",
    unit: null,
  },
];
