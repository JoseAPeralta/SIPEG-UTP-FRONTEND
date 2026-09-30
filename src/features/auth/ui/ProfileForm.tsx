import {
  Box,
  Button,
  Field,
  Heading,
  Input,
  NativeSelect,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useMemo, useRef, useState, type FormEvent } from "react";

import { Surface } from "@/components";
import { globalRoleLabels } from "@/features/users";
import type { AuthenticatedUser, Career, OrganizationalUnit } from "@/types/domain";

import {
  PROFILE_NAME_MAX_LENGTH,
  toProfileUpdateRequest,
  validateProfileNames,
  type ProfileErrors,
  type ProfileFormValues,
} from "../model/profileValidation";

export type ProfileFormProps = {
  careers: Career[];
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onSubmit: (request: ReturnType<typeof toProfileUpdateRequest>) => Promise<void> | void;
  organizationalUnits: OrganizationalUnit[];
  profile: AuthenticatedUser;
  successMessage?: string | null;
};

function toFormValues(profile: AuthenticatedUser): ProfileFormValues {
  return {
    careerId: profile.career?.id ?? "",
    firstName: profile.firstName,
    lastName: profile.lastName,
    unitId: profile.unit?.id ?? "",
  };
}

/**
 * Collects the profile attributes the contract allows to edit. Email, identification number and global
 * role are rendered as read-only text, never as controls, and no payload is built here beyond the
 * four editable fields. The parent remounts this component with a key derived from the stored profile
 * so the form re-prefills after a successful update without an effect that would write state.
 */
export function ProfileForm({
  careers,
  errorMessage = null,
  isSubmitting = false,
  onSubmit,
  organizationalUnits,
  profile,
  successMessage = null,
}: ProfileFormProps) {
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [values, setValues] = useState<ProfileFormValues>(() => toFormValues(profile));

  const original = useMemo(
    () => ({
      careerId: profile.career?.id ?? "",
      firstName: profile.firstName,
      lastName: profile.lastName,
      unitId: profile.unit?.id ?? "",
    }),
    [profile],
  );

  const pendingRequest = toProfileUpdateRequest(values, original);
  const hasChanges = Object.keys(pendingRequest).length > 0;
  const isOtherUnit = values.unitId === "";

  const unitOptions = useMemo(() => {
    const activeUnits = organizationalUnits.filter((unit) => unit.isActive);
    const currentUnitIsListed = activeUnits.some((unit) => unit.id === values.unitId);

    return currentUnitIsListed
      ? activeUnits
      : [
          ...activeUnits,
          ...(profile.unit
            ? [
                {
                  code: profile.unit.code,
                  description: null,
                  head: null,
                  id: profile.unit.id,
                  isActive: false,
                  name: profile.unit.name,
                  type: "FACULTY" as const,
                },
              ]
            : []),
        ];
  }, [organizationalUnits, profile.unit, values.unitId]);

  const careerOptions = useMemo(() => {
    const available = careers.filter(
      (career) => career.unitId === values.unitId || career.unitId === null,
    );
    const currentIsListed = available.some((career) => career.id === values.careerId);

    if (currentIsListed || !profile.career) {
      return available;
    }

    return [
      ...available,
      {
        code: profile.career.code,
        id: profile.career.id,
        name: profile.career.name,
        unitId: null,
      },
    ];
  }, [careers, profile.career, values.careerId, values.unitId]);

  const updateValue = (field: keyof ProfileFormValues, value: string) => {
    setValues((current) => ({
      ...current,
      [field]: value,
      ...(field === "unitId" ? { careerId: "" } : {}),
    }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validateProfileNames(values);
    setErrors(validationErrors);

    if (validationErrors.firstName) {
      firstNameRef.current?.focus();
      return;
    }

    if (validationErrors.lastName) {
      lastNameRef.current?.focus();
      return;
    }

    void onSubmit(toProfileUpdateRequest(values, original));
  };

  return (
    <Surface elevation="overlay" padding="roomy">
      <form noValidate onSubmit={handleSubmit}>
        <Stack gap={6}>
          <Stack gap={3}>
            <Text
              color="accent.solid"
              fontSize="sm"
              fontWeight="800"
              letterSpacing="0.14em"
              textTransform="uppercase"
            >
              Datos Personales
            </Text>
            <Heading as="h2" fontFamily="heading" fontSize={{ base: "2xl", md: "3xl" }}>
              Mantenga sus datos al día
            </Heading>
            <Text color="text.muted" lineHeight="1.7">
              Solo puede actualizar su nombre, su apellido, su unidad y su carrera. El resto de la
              información la administra SIPEG.
            </Text>
          </Stack>

          <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
            <Field.Root invalid={Boolean(errors.firstName)} required>
              <Field.Label>Nombre</Field.Label>
              <Input
                autoComplete="given-name"
                disabled={isSubmitting}
                maxLength={PROFILE_NAME_MAX_LENGTH}
                onChange={(event) => updateValue("firstName", event.currentTarget.value)}
                ref={firstNameRef}
                value={values.firstName}
              />
              <Field.ErrorText>{errors.firstName}</Field.ErrorText>
            </Field.Root>

            <Field.Root invalid={Boolean(errors.lastName)} required>
              <Field.Label>Apellido</Field.Label>
              <Input
                autoComplete="family-name"
                disabled={isSubmitting}
                maxLength={PROFILE_NAME_MAX_LENGTH}
                onChange={(event) => updateValue("lastName", event.currentTarget.value)}
                ref={lastNameRef}
                value={values.lastName}
              />
              <Field.ErrorText>{errors.lastName}</Field.ErrorText>
            </Field.Root>
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
            <Field.Root disabled={isSubmitting}>
              <Field.Label>Unidad / Facultad</Field.Label>
              <NativeSelect.Root disabled={isSubmitting}>
                <NativeSelect.Field
                  onChange={(event) => updateValue("unitId", event.currentTarget.value)}
                  value={values.unitId}
                >
                  <option value="">Otros</option>
                  {unitOptions.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                      {unit.isActive ? "" : " (no disponible)"}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root disabled={isOtherUnit || isSubmitting}>
              <Field.Label>Carrera</Field.Label>
              <NativeSelect.Root disabled={isOtherUnit || isSubmitting}>
                <NativeSelect.Field
                  onChange={(event) => updateValue("careerId", event.currentTarget.value)}
                  value={isOtherUnit ? "" : values.careerId}
                >
                  {isOtherUnit ? (
                    <option value="">Otros</option>
                  ) : (
                    <>
                      <option value="">Seleccione una carrera</option>
                      {careerOptions.map((career) => (
                        <option key={career.id} value={career.id}>
                          {career.name}
                        </option>
                      ))}
                    </>
                  )}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
              <Field.HelperText>
                {isOtherUnit
                  ? "Al elegir “Otros”, SIPEG asigna la carrera global “Otros”."
                  : "Solo puede elegir una carrera de la unidad seleccionada."}
              </Field.HelperText>
            </Field.Root>
          </SimpleGrid>

          <Box
            aria-label="Datos de solo lectura"
            as="section"
            bg="surface.raised"
            borderColor="border.subtle"
            borderRadius="panel"
            borderWidth="1px"
            p={4}
            role="group"
          >
            <Stack gap={2}>
              <Text color="text.muted" fontSize="sm" fontWeight="700">
                Datos de solo lectura
              </Text>
              <Text color="text.default" fontSize="sm">
                Correo electrónico: {profile.email}
              </Text>
              <Text color="text.default" fontSize="sm">
                Cédula: {profile.identificationNumber}
              </Text>
              <Text color="text.default" fontSize="sm">
                Rol: {globalRoleLabels[profile.globalRole]}
              </Text>
            </Stack>
          </Box>

          {errorMessage ? (
            <Text color="error.solid" fontSize="sm" role="alert">
              {errorMessage}
            </Text>
          ) : null}

          {successMessage ? (
            <Text color="text.muted" fontSize="sm" role="status">
              {successMessage}
            </Text>
          ) : null}

          <Button
            alignSelf={{ base: "stretch", md: "start" }}
            colorPalette="terracotta"
            disabled={isSubmitting || !hasChanges}
            rounded="full"
            size="lg"
            type="submit"
          >
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </Stack>
      </form>
    </Surface>
  );
}
