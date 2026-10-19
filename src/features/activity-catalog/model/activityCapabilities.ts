export type ActivityCapabilities = {
  canCancel: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canEdit: boolean;
  canRead: boolean;
  /**
   * Verdadero mientras el descubrimiento de scopes del modo operativo esta en curso. Evita
   * presentar "sin acceso" antes de conocer las capacidades reales.
   */
  isResolving: boolean;
};
