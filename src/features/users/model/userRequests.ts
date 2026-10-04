import type { GlobalRole } from "@/types/domain";

/**
 * Cuerpo de alta administrativa. No incluye `globalRole` porque el contrato siempre crea la cuenta
 * con rol `USER`; la promocion es una operacion aparte. `unitId: null` selecciona la opcion "Otro" y
 * el backend reserva la carrera global "Otros" para ese caso.
 */
export type CreateAdminUserRequest = {
  careerId?: string;
  email: string;
  firstName: string;
  identificationNumber: string;
  lastName: string;
  password: string;
  unitId: string | null;
};

/**
 * Parche parcial. Solo los cuatro campos que el contrato permite cambiar; nombres, correo, cedula
 * y el identificador se administran en otro flujo y nunca viajan desde este formulario.
 */
export type UpdateAdminUserRequest = {
  careerId?: string;
  globalRole?: GlobalRole;
  isActive?: boolean;
  unitId?: string | null;
};
