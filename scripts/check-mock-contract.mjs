import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { DEFAULT_SOURCE, createOperationView, loadOpenApi } from "./query-api-contract.mjs";

const ACTIVITY_TYPES = [
  "WORKSHOP",
  "SEMINAR",
  "TALK",
  "CONFERENCE",
  "PANEL",
  "COURSE",
  "COMPETITION",
  "OTHER",
];
const ACTIVITY_STATUSES = ["DRAFT", "SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"];
const EVENT_PROGRAM_STATUSES = ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED", "ARCHIVED"];
const ORGANIZATIONAL_UNIT_TYPES = ["FACULTY", "SUBDIRECTORATE"];
const CLASSROOM_TYPES = ["LABORATORY", "CLASSROOM"];
const GLOBAL_ROLES = ["ADMIN", "USER"];
const COLLABORATION_ROLES = ["VIEWER", "EDITOR", "ORGANIZER"];
const USER_SCOPE_TYPES = ["program", "activity"];
const USER_SCOPE_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
  "SCHEDULED",
  "ONGOING",
];
const PERMISSION_ORIGINS = ["LOCAL", "INHERITED", "BOTH"];
const ALERT_TYPES = [
  "PROPOSAL_RECEIVED",
  "PROPOSAL_UPDATED",
  "PROPOSAL_RESPONDED",
  "PROGRAM_UPDATED",
  "PROGRAM_ARCHIVED",
  "ACTIVITY_UPDATED",
  "ACTIVITY_CANCELLED",
  "CERTIFICATE_ISSUED",
];
const PERMISSION_NAMES = [
  "program:read",
  "program:create",
  "program:update",
  "program:archive",
  "program:reactivate",
  "activity:read",
  "activity:create",
  "activity:update",
  "activity:cancel",
  "activity:delete",
  "attendance:register",
  "attendance:checkin",
  "attendance:manage",
  "certificate:read",
  "certificate:generate",
  "proposal:read",
  "proposal:review",
  "proposal:feedback",
  "report:view",
  "report:export",
  "permission:grant",
];

export const CONTRACT_EXPECTATIONS = [
  {
    method: "GET",
    path: "/api/v1/activities",
    schema: "ActivityListItem",
    required: [
      "id",
      "name",
      "description",
      "type",
      "date",
      "startTime",
      "endTime",
      "capacity",
      "bannerUrl",
      "speakers",
      "classroom",
      "eventProgram",
      "organizationalUnit",
    ],
    enums: { type: ACTIVITY_TYPES },
  },
  {
    method: "GET",
    path: "/api/v1/event-programs/{id}/activities",
    schema: "EventProgramActivityItem",
    required: [
      "id",
      "name",
      "description",
      "type",
      "date",
      "startTime",
      "endTime",
      "capacity",
      "bannerUrl",
      "speakers",
      "classroom",
      "eventProgram",
      "organizationalUnit",
      "status",
    ],
    enums: { type: ACTIVITY_TYPES, status: ACTIVITY_STATUSES },
  },
  {
    method: "GET",
    path: "/api/v1/activities/{id}",
    schema: "ActivityDetail",
    required: [
      "id",
      "name",
      "description",
      "type",
      "date",
      "startTime",
      "endTime",
      "capacity",
      "bannerUrl",
      "status",
      "cancelReason",
      "equipment",
      "enrolledCount",
      "checkedInCount",
      "speakers",
      "classroom",
      "eventProgram",
      "organizationalUnit",
    ],
    enums: { type: ACTIVITY_TYPES, status: ACTIVITY_STATUSES },
  },
  {
    method: "GET",
    path: "/api/v1/event-programs",
    schema: "EventProgramDetail",
    required: [
      "id",
      "name",
      "description",
      "label",
      "bannerUrl",
      "isDefault",
      "status",
      "startDate",
      "endDate",
      "organizationalUnit",
    ],
    enums: { status: EVENT_PROGRAM_STATUSES },
  },
  {
    method: "GET",
    path: "/api/v1/organizational-units",
    schema: "OrganizationalUnitSummary",
    required: ["id", "name", "code", "description", "type", "isActive", "head"],
    enums: { type: ORGANIZATIONAL_UNIT_TYPES },
  },
  {
    method: "GET",
    path: "/api/v1/organizational-units/{id}",
    schema: "OrganizationalUnitDetail",
    required: [
      "id",
      "name",
      "code",
      "description",
      "type",
      "isActive",
      "head",
      "careers",
      "defaultProgram",
    ],
    enums: { type: ORGANIZATIONAL_UNIT_TYPES },
  },
  {
    method: "POST",
    path: "/api/v1/organizational-units",
    schema: "OrganizationalUnitDetail",
    required: [
      "id",
      "name",
      "code",
      "description",
      "type",
      "isActive",
      "head",
      "careers",
      "defaultProgram",
    ],
    enums: { type: ORGANIZATIONAL_UNIT_TYPES },
  },
  {
    method: "PATCH",
    path: "/api/v1/organizational-units/{id}",
    schema: "OrganizationalUnitDetail",
    required: [
      "id",
      "name",
      "code",
      "description",
      "type",
      "isActive",
      "head",
      "careers",
      "defaultProgram",
    ],
    enums: { type: ORGANIZATIONAL_UNIT_TYPES },
  },
  {
    method: "POST",
    path: "/api/v1/organizational-units/{id}/deactivate",
    schema: "OrganizationalUnitDetail",
    required: [
      "id",
      "name",
      "code",
      "description",
      "type",
      "isActive",
      "head",
      "careers",
      "defaultProgram",
    ],
    enums: { type: ORGANIZATIONAL_UNIT_TYPES },
  },
  {
    method: "POST",
    path: "/api/v1/organizational-units/{id}/reactivate",
    schema: "OrganizationalUnitDetail",
    required: [
      "id",
      "name",
      "code",
      "description",
      "type",
      "isActive",
      "head",
      "careers",
      "defaultProgram",
    ],
    enums: { type: ORGANIZATIONAL_UNIT_TYPES },
  },
  {
    method: "GET",
    path: "/api/v1/classrooms",
    schema: "ClassroomSummary",
    required: ["id", "name", "type", "capacity", "building", "floor", "isActive", "amenities"],
    enums: { type: CLASSROOM_TYPES },
  },
  {
    method: "GET",
    path: "/api/v1/classrooms/available",
    schema: "ClassroomSummary",
    required: ["id", "name", "type", "capacity", "building", "floor", "isActive", "amenities"],
    enums: { type: CLASSROOM_TYPES },
  },
  {
    method: "GET",
    path: "/api/v1/classrooms/{id}",
    schema: "ClassroomDetail",
    required: [
      "id",
      "name",
      "type",
      "capacity",
      "building",
      "floor",
      "isActive",
      "amenities",
      "availability",
    ],
    enums: { type: CLASSROOM_TYPES },
  },
  {
    method: "POST",
    path: "/api/v1/classrooms",
    schema: "CreateClassroom",
    required: ["name", "type", "capacity"],
    enums: { type: CLASSROOM_TYPES },
  },
  {
    // El parche es parcial: el contrato no declara `required`, solo que debe haber al menos un
    // campo. La unica enumeracion que puede desviarse sigue siendo `type`.
    method: "PATCH",
    path: "/api/v1/classrooms/{id}",
    schema: "UpdateClassroom",
    required: [],
    enums: { type: CLASSROOM_TYPES },
  },
  {
    method: "POST",
    path: "/api/v1/classrooms/{id}/availability",
    schema: "AddClassroomAvailability",
    required: ["dayOfWeek", "startTime", "endTime"],
    enums: {},
  },
  {
    method: "GET",
    path: "/api/v1/careers",
    schema: "CareerSummary",
    required: ["id", "name", "code", "description", "unit"],
    enums: {},
  },
  {
    method: "GET",
    path: "/api/v1/admin/users",
    schema: "AdminUser",
    required: [
      "id",
      "firstName",
      "lastName",
      "identificationNumber",
      "email",
      "globalRole",
      "isActive",
      "unit",
      "career",
    ],
    enums: { globalRole: GLOBAL_ROLES },
  },
  {
    method: "POST",
    path: "/api/v1/admin/users",
    schema: "AdminUser",
    required: [
      "id",
      "firstName",
      "lastName",
      "identificationNumber",
      "email",
      "globalRole",
      "isActive",
      "unit",
      "career",
    ],
    enums: { globalRole: GLOBAL_ROLES },
  },
  {
    method: "GET",
    path: "/api/v1/admin/users/{id}",
    schema: "AdminUser",
    required: [
      "id",
      "firstName",
      "lastName",
      "identificationNumber",
      "email",
      "globalRole",
      "isActive",
      "unit",
      "career",
    ],
    enums: { globalRole: GLOBAL_ROLES },
  },
  {
    method: "PATCH",
    path: "/api/v1/admin/users/{id}",
    schema: "AdminUser",
    required: [
      "id",
      "firstName",
      "lastName",
      "identificationNumber",
      "email",
      "globalRole",
      "isActive",
      "unit",
      "career",
    ],
    enums: { globalRole: GLOBAL_ROLES },
    requestBody: { enums: { globalRole: GLOBAL_ROLES } },
  },
  {
    method: "POST",
    path: "/api/v1/event-programs/{id}/collaborators",
    requestBody: { enums: { role: COLLABORATION_ROLES } },
  },
  {
    method: "PATCH",
    path: "/api/v1/event-programs/{id}/collaborators/{userId}",
    requestBody: { enums: { role: COLLABORATION_ROLES } },
  },
  {
    method: "POST",
    path: "/api/v1/activities/{id}/collaborators",
    requestBody: { enums: { role: COLLABORATION_ROLES } },
  },
  {
    method: "PATCH",
    path: "/api/v1/activities/{id}/collaborators/{userId}",
    requestBody: { enums: { role: COLLABORATION_ROLES } },
  },
  {
    method: "POST",
    path: "/api/v1/event-programs/{id}/permissions",
    requestBody: { enums: { permission: PERMISSION_NAMES } },
  },
  {
    method: "POST",
    path: "/api/v1/activities/{id}/permissions",
    requestBody: { enums: { permission: PERMISSION_NAMES } },
  },
  {
    method: "GET",
    path: "/api/v1/users/me/scopes",
    schema: "UserScope",
    required: ["type", "id", "name", "status", "eventProgram", "organizationalUnit", "permissions"],
    enums: { type: USER_SCOPE_TYPES, status: USER_SCOPE_STATUSES },
  },
  {
    method: "GET",
    path: "/api/v1/users/me/scopes",
    schema: "OwnPermission",
    required: ["name", "origin", "validFrom", "validUntil"],
    enums: { origin: PERMISSION_ORIGINS },
  },
  ...["event-programs", "activities"].flatMap((resource) => [
    {
      method: "GET",
      path: `/api/v1/${resource}/{id}/collaborators`,
      schema: "CollaboratorListDetail",
      required: ["userId", "firstName", "lastName", "email", "role", "createdAt", "permissions"],
      enums: { role: COLLABORATION_ROLES },
    },
    {
      method: "GET",
      path: `/api/v1/${resource}/{id}/collaborators`,
      schema: "CollaboratorListPermission",
      required: ["name", "source", "origin", "validFrom", "validUntil", "effective"],
      enums: { source: ["ROLE_DEFAULT", "OVERRIDE"], origin: PERMISSION_ORIGINS },
    },
    { method: "DELETE", path: `/api/v1/${resource}/{id}/collaborators/{userId}` },
    { method: "DELETE", path: `/api/v1/${resource}/{id}/permissions/{permission}` },
    ...["POST", "PATCH"].map((method) => ({
      method,
      path: `/api/v1/${resource}/{id}/collaborators${method === "PATCH" ? "/{userId}" : ""}`,
      schema: "Collaborator",
      required: ["userId", "firstName", "lastName", "email", "role", "createdAt", "permissions"],
      enums: { role: COLLABORATION_ROLES },
    })),
  ]),
  {
    method: "GET",
    path: "/api/v1/users/me/permissions",
    schema: "OwnPermissions",
    required: ["scope", "permissions"],
  },
  {
    method: "GET",
    path: "/api/v1/users/me/permissions",
    schema: "OwnPermission",
    required: ["name", "origin", "validFrom", "validUntil"],
    enums: { origin: PERMISSION_ORIGINS },
  },
  {
    method: "GET",
    path: "/api/v1/alerts",
    schema: "Alert",
    required: ["id", "type", "isRead", "createdAt", "target"],
    enums: { type: ALERT_TYPES },
  },
  {
    method: "GET",
    path: "/api/v1/alerts",
    schema: "PaginatedAlerts",
    required: ["items", "page", "limit", "total", "totalPages"],
  },
  {
    method: "PATCH",
    path: "/api/v1/alerts/{id}/read",
    schema: "Alert",
    required: ["id", "type", "isRead", "createdAt", "target"],
    enums: { type: ALERT_TYPES },
  },
  {
    method: "POST",
    path: "/api/v1/alerts/read-all",
    schema: "MarkAllAlertsReadResult",
    required: ["updatedCount"],
  },
];

const USAGE = `Usage:
  pnpm run api:mocks-check [--source <path-or-url>]`;

export function compareContract(document, expectations = CONTRACT_EXPECTATIONS) {
  const issues = [];
  let checks = 0;

  for (const expectation of expectations) {
    const label = `${expectation.method} ${expectation.path}`;
    const registeredSchemas = document.components?.schemas ?? {};

    if (expectation.schema && !registeredSchemas[expectation.schema]) {
      issues.push(`${label}: el schema ${expectation.schema} ya no existe en el contrato.`);
      continue;
    }

    let view;

    try {
      view = createOperationView(document, expectation.method, expectation.path);
    } catch {
      issues.push(`${label}: la operacion ya no existe en el contrato OpenAPI.`);
      continue;
    }

    if (expectation.schema) {
      const schema =
        view.components.schemas?.[expectation.schema] ?? registeredSchemas[expectation.schema];
      const required = Array.isArray(schema.required) ? schema.required : [];

      for (const field of expectation.required ?? []) {
        checks += 1;
        if (!required.includes(field)) {
          issues.push(`${label} (${expectation.schema}): falta el campo requerido ${field}.`);
        }
      }

      for (const [field, expectedValues] of Object.entries(expectation.enums ?? {})) {
        checks += checkEnum(
          schema,
          field,
          expectedValues,
          `${label} (${expectation.schema})`,
          issues,
        );
      }
    }

    if (expectation.requestBody) {
      const bodySchema = view.operation?.requestBody?.content?.["application/json"]?.schema;

      for (const [field, expectedValues] of Object.entries(expectation.requestBody.enums ?? {})) {
        checks += checkEnum(bodySchema, field, expectedValues, `${label} (requestBody)`, issues);
      }
    }
  }

  return { checks, issues };
}

function checkEnum(schema, field, expectedValues, label, issues) {
  const property = schema?.properties?.[field];
  const actualValues = Array.isArray(property?.enum) ? property.enum : undefined;

  if (!actualValues) {
    issues.push(`${label}.${field}: el campo ya no declara enum.`);
    return 1;
  }

  for (const value of expectedValues) {
    if (!actualValues.includes(value)) {
      issues.push(
        `${label}.${field}: el contrato ya no incluye ${value}; actualiza dominio, mappers, mocks y tests.`,
      );
    }
  }

  for (const value of actualValues) {
    if (!expectedValues.includes(value)) {
      issues.push(
        `${label}.${field}: nuevo valor ${value} en el contrato; actualiza dominio, mappers, mocks y tests.`,
      );
    }
  }

  return 1;
}

export function parseSource(argumentsList) {
  let source;

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];

    if (argument === "--source") {
      source = argumentsList[index + 1];
      if (!source || source.startsWith("--")) {
        throw new Error(USAGE);
      }
      index += 1;
      continue;
    }

    throw new Error(`${USAGE}\n\nOpcion desconocida: ${argument}`);
  }

  return source;
}

export async function main(argumentsList = process.argv.slice(2)) {
  const source = parseSource(argumentsList) ?? process.env.SIPEG_OPENAPI_SOURCE ?? DEFAULT_SOURCE;
  const document = await loadOpenApi(source);
  const { checks, issues } = compareContract(document);

  if (issues.length > 0) {
    console.error(
      `El contrato OpenAPI cambio respecto a los mocks y mappers (${issues.length} problema(s) de ${checks} verificaciones):`,
    );
    issues.forEach((issue) => console.error(`  - ${issue}`));
    console.error(
      "Actualiza src/types/domain.ts, los mappers de cada feature, src/data/mock y sus tests antes de continuar.",
    );
    process.exitCode = 1;
    return { checks, issues };
  }

  console.log(
    `Mocks compatibles con el contrato OpenAPI (${checks} verificaciones en ${CONTRACT_EXPECTATIONS.length} operaciones).`,
  );

  return { checks, issues };
}

const entryPoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (entryPoint === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
