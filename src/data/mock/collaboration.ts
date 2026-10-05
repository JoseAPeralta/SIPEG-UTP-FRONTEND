import type { EffectiveCollaborator } from "@/features/collaboration/model/collaborators";
import type { CollaborationScope } from "@/features/collaboration/model/ownPermissions";

/** Escenario explícito; no representa una matriz de permisos predeterminados por rol. */
export const collaborationFixtures: {
  scope: CollaborationScope;
  collaborators: EffectiveCollaborator[];
}[] = [
  {
    scope: { type: "program", id: "program-fisc-default" },
    collaborators: [
      {
        userId: "user-1",
        firstName: "Mariana",
        lastName: "Rodriguez",
        email: "mariana.rodriguez@example.edu",
        role: "ORGANIZER",
        createdAt: "2026-01-01T00:00:00Z",
        permissions: [
          {
            name: "permission:grant",
            source: "OVERRIDE",
            origin: "LOCAL",
            validFrom: null,
            validUntil: null,
            effective: true,
          },
        ],
      },
    ],
  },
];
