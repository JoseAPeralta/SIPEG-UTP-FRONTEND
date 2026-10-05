import { Button, Field, Heading, Input, Stack, Text } from "@chakra-ui/react";
import { useRef, useState, type FormEvent } from "react";

import type { PasswordChangeRequest } from "@/app/adapters/contracts";
import { Surface } from "@/components";

import {
  PASSWORD_RESET_MAX_LENGTH,
  PASSWORD_RESET_MIN_LENGTH,
} from "../model/passwordRecoveryValidation";
import {
  toPasswordChangeRequest,
  validatePasswordChange,
  type PasswordChangeErrors,
} from "../model/passwordChangeValidation";

export type ChangePasswordFormProps = {
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onSubmit: (request: PasswordChangeRequest) => Promise<void> | void;
};

/**
 * Collects the current password and its replacement for an authenticated session. The component
 * never receives credentials: the session tokens are read by `useChangePassword` and forwarded to
 * the adapter, so they never reach the DOM, the URL or this component's props.
 */
export function ChangePasswordForm({
  errorMessage = null,
  isSubmitting = false,
  onSubmit,
}: ChangePasswordFormProps) {
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errors, setErrors] = useState<PasswordChangeErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validatePasswordChange({
      confirmPassword,
      currentPassword,
      newPassword,
    });
    setErrors(validationErrors);

    const firstInvalidField = (["currentPassword", "newPassword", "confirmPassword"] as const).find(
      (field) => validationErrors[field],
    );

    if (firstInvalidField) {
      const refs = {
        confirmPassword: confirmPasswordRef,
        currentPassword: currentPasswordRef,
        newPassword: newPasswordRef,
      };
      refs[firstInvalidField].current?.focus();
      return;
    }

    void onSubmit(toPasswordChangeRequest({ confirmPassword, currentPassword, newPassword }));
  };

  function passwordInput(
    autoComplete: "current-password" | "new-password",
    field: "confirmPassword" | "currentPassword" | "newPassword",
    inputRef: React.Ref<HTMLInputElement>,
  ) {
    const value = { confirmPassword, currentPassword, newPassword }[field];

    return (
      <Input
        autoComplete={autoComplete}
        disabled={isSubmitting}
        maxLength={field === "currentPassword" ? undefined : PASSWORD_RESET_MAX_LENGTH}
        onChange={(event) => {
          const nextValue = event.currentTarget.value;

          if (field === "newPassword") {
            setNewPassword(nextValue);
          } else if (field === "currentPassword") {
            setCurrentPassword(nextValue);
          } else {
            setConfirmPassword(nextValue);
          }

          setErrors((current) => ({ ...current, [field]: undefined }));
        }}
        ref={inputRef}
        type={showPassword ? "text" : "password"}
        value={value}
      />
    );
  }

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
              Seguridad de la cuenta
            </Text>
            <Heading as="h2" fontFamily="heading" fontSize={{ base: "2xl", md: "3xl" }}>
              Cambie su contraseña
            </Heading>
            <Text color="text.muted" lineHeight="1.7">
              Al guardarla, se cerrarán sus otras sesiones abiertas y seguirá con esta sesión
              activa.
            </Text>
          </Stack>

          <Field.Root invalid={Boolean(errors.currentPassword)} required>
            <Field.Label>Contraseña actual</Field.Label>
            {passwordInput("current-password", "currentPassword", currentPasswordRef)}
            <Field.ErrorText>{errors.currentPassword}</Field.ErrorText>
          </Field.Root>

          <Field.Root invalid={Boolean(errors.newPassword)} required>
            <Field.Label>Nueva contraseña</Field.Label>
            {passwordInput("new-password", "newPassword", newPasswordRef)}
            <Field.HelperText>
              Debe tener entre {PASSWORD_RESET_MIN_LENGTH} y {PASSWORD_RESET_MAX_LENGTH} caracteres.
            </Field.HelperText>
            <Field.ErrorText>{errors.newPassword}</Field.ErrorText>
          </Field.Root>

          <Field.Root invalid={Boolean(errors.confirmPassword)} required>
            <Field.Label>Confirmar contraseña</Field.Label>
            {passwordInput("new-password", "confirmPassword", confirmPasswordRef)}
            <Field.ErrorText>{errors.confirmPassword}</Field.ErrorText>
          </Field.Root>

          <Button
            alignSelf={{ base: "stretch", md: "start" }}
            colorPalette="terracotta"
            disabled={isSubmitting}
            onClick={() => setShowPassword((current) => !current)}
            rounded="full"
            size="sm"
            type="button"
            variant="outline"
          >
            {showPassword ? "Ocultar contraseñas" : "Mostrar contraseñas"}
          </Button>

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
            {isSubmitting ? "Cambiando..." : "Cambiar contraseña"}
          </Button>
        </Stack>
      </form>
    </Surface>
  );
}
