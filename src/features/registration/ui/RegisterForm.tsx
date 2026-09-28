import {
  Button,
  Field,
  Input,
  InputGroup,
  NativeSelect,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useState, type FormEvent } from "react";

import { Surface } from "@/components";
import type { Career, OrganizationalUnit, RegistrationPayload } from "@/types/domain";

import {
  type RegistrationErrors,
  validateRegistrationPayload,
} from "../model/registrationValidation";

export type RegisterFormProps = {
  careers: Career[];
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onSubmit: (payload: RegistrationPayload) => Promise<void> | void;
  organizationalUnits: OrganizationalUnit[];
};

type FormValues = {
  careerId: string;
  email: string;
  firstName: string;
  identificationNumber: string;
  lastName: string;
  password: string;
  unitId: string;
};

const initialValues: FormValues = {
  careerId: "",
  email: "",
  firstName: "",
  identificationNumber: "",
  lastName: "",
  password: "",
  unitId: "",
};

/** Collects the public registration payload and mirrors the API contract validation rules. */
export function RegisterForm({
  careers,
  errorMessage = null,
  isSubmitting = false,
  onSubmit,
  organizationalUnits,
}: RegisterFormProps) {
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [values, setValues] = useState<FormValues>(initialValues);
  const selectedUnit = organizationalUnits.find((unit) => unit.id === values.unitId) ?? null;
  const careerEnabled = selectedUnit?.type === "FACULTY";
  const careerOptions = careers.filter(
    (career) => career.unitId === selectedUnit?.id || career.unitId === null,
  );

  const updateValue = (field: keyof FormValues, value: string) => {
    setValues((current) => ({
      ...current,
      [field]: value,
      ...(field === "unitId" ? { careerId: "" } : {}),
    }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: RegistrationPayload = {
      email: values.email.trim(),
      firstName: values.firstName.trim(),
      identificationNumber: values.identificationNumber.trim(),
      lastName: values.lastName.trim(),
      password: values.password,
      ...(values.unitId ? { unitId: values.unitId } : {}),
      ...(careerEnabled && values.careerId ? { careerId: values.careerId } : {}),
    };
    const validationErrors = validateRegistrationPayload(payload);

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      void onSubmit(payload);
    }
  };

  const activeUnits = organizationalUnits.filter((unit) => unit.isActive);
  const localCareers = careerOptions.filter((career) => career.unitId !== null);
  const globalCareers = careerOptions.filter((career) => career.unitId === null);

  return (
    <Surface elevation="overlay" padding="roomy">
      <form noValidate onSubmit={handleSubmit}>
        <Stack gap={6}>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
            <Field.Root invalid={Boolean(errors.firstName)} required>
              <Field.Label>Nombre</Field.Label>
              <Input
                autoComplete="given-name"
                disabled={isSubmitting}
                maxLength={100}
                onChange={(event) => updateValue("firstName", event.currentTarget.value)}
                value={values.firstName}
              />
              <Field.ErrorText>{errors.firstName}</Field.ErrorText>
            </Field.Root>

            <Field.Root invalid={Boolean(errors.lastName)} required>
              <Field.Label>Apellido</Field.Label>
              <Input
                autoComplete="family-name"
                disabled={isSubmitting}
                maxLength={100}
                onChange={(event) => updateValue("lastName", event.currentTarget.value)}
                value={values.lastName}
              />
              <Field.ErrorText>{errors.lastName}</Field.ErrorText>
            </Field.Root>

            <Field.Root invalid={Boolean(errors.identificationNumber)} required>
              <Field.Label>Cédula</Field.Label>
              <Input
                autoComplete="off"
                disabled={isSubmitting}
                maxLength={30}
                onChange={(event) => updateValue("identificationNumber", event.currentTarget.value)}
                value={values.identificationNumber}
              />
              <Field.ErrorText>{errors.identificationNumber}</Field.ErrorText>
            </Field.Root>

            <Field.Root invalid={Boolean(errors.email)} required>
              <Field.Label>Correo electrónico</Field.Label>
              <Input
                autoComplete="email"
                disabled={isSubmitting}
                maxLength={254}
                onChange={(event) => updateValue("email", event.currentTarget.value)}
                type="email"
                value={values.email}
              />
              <Field.ErrorText>{errors.email}</Field.ErrorText>
            </Field.Root>
          </SimpleGrid>

          <Field.Root invalid={Boolean(errors.password)} required>
            <Field.Label>Contraseña</Field.Label>
            <InputGroup
              endElement={
                <Button
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  disabled={isSubmitting}
                  onClick={() => setShowPassword((current) => !current)}
                  size="xs"
                  type="button"
                  variant="ghost"
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </Button>
              }
              endElementProps={{ pointerEvents: "auto" }}
            >
              <Input
                autoComplete="new-password"
                disabled={isSubmitting}
                maxLength={128}
                onChange={(event) => updateValue("password", event.currentTarget.value)}
                type={showPassword ? "text" : "password"}
                value={values.password}
              />
            </InputGroup>
            <Field.HelperText>Debe tener entre 12 y 128 caracteres.</Field.HelperText>
            <Field.ErrorText>{errors.password}</Field.ErrorText>
          </Field.Root>

          <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
            <Field.Root>
              <Field.Label>Unidad / Facultad</Field.Label>
              <NativeSelect.Root disabled={isSubmitting}>
                <NativeSelect.Field
                  onChange={(event) => updateValue("unitId", event.currentTarget.value)}
                  value={values.unitId}
                >
                  <option value="">Otros</option>
                  {activeUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root disabled={!careerEnabled || isSubmitting}>
              <Field.Label>Carrera</Field.Label>
              <NativeSelect.Root disabled={!careerEnabled || isSubmitting}>
                <NativeSelect.Field
                  onChange={(event) => updateValue("careerId", event.currentTarget.value)}
                  value={values.careerId}
                >
                  <option value="">Seleccione una carrera</option>
                  {localCareers.map((career) => (
                    <option key={career.id} value={career.id}>
                      {career.name}
                    </option>
                  ))}
                  {globalCareers.map((career) => (
                    <option key={career.id} value={career.id}>
                      {career.name}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
              {!careerEnabled ? (
                <Field.HelperText>Disponible al seleccionar una facultad.</Field.HelperText>
              ) : null}
            </Field.Root>
          </SimpleGrid>

          {errorMessage ? (
            <Text color="error.solid" fontSize="sm" role="alert">
              {errorMessage}
            </Text>
          ) : null}

          <Button
            alignSelf={{ base: "stretch", md: "start" }}
            colorPalette="terracotta"
            disabled={isSubmitting}
            rounded="full"
            size="lg"
            type="submit"
          >
            {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </Stack>
      </form>
    </Surface>
  );
}
