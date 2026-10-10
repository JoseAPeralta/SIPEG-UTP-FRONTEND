export type CreateEventProgramRequest = {
  description: string | null;
  endDate: string;
  label: string | null;
  name: string;
  organizationalUnitId: string;
  startDate: string;
};

/**
 * Parche parcial de la edicion. La unidad propietaria y `isDefault` no son editables y `status`
 * solo admite la publicacion `DRAFT -> ACTIVE`; el adapter reconstruye el cuerpo con una allowlist.
 */
export type UpdateEventProgramRequest = {
  bannerUrl?: string | null;
  description?: string | null;
  endDate?: string;
  label?: string | null;
  name?: string;
  startDate?: string;
  status?: "ACTIVE";
};
