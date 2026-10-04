import type { GlobalRole, OrganizationReference } from "@/types/domain";

/**
 * Vista administrativa de una cuenta (`AdminUser` del contrato).
 *
 * Las referencias institucionales vienen embebidas en la respuesta, de modo que la pantalla de
 * usuarios no necesita consultar los catalogos de unidades y carreras para etiquetar una fila.
 */
export type AdminUser = {
  career: OrganizationReference | null;
  email: string;
  firstName: string;
  globalRole: GlobalRole;
  id: string;
  identificationNumber: string;
  isActive: boolean;
  lastName: string;
  unit: OrganizationReference | null;
};

/**
 * Pagina del listado administrativo. Conserva la metadata completa aunque 3.1 recorra y aplane las
 * paginas: 3.2 la necesita para paginar en la UI sin volver a tocar el mapper.
 */
export type AdminUsersPage = {
  items: AdminUser[];
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};
