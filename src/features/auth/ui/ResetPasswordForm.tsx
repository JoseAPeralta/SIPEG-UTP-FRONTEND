import { Button, Field, Heading, Input, Stack, Text } from "@chakra-ui/react";
import { useRef, useState, type FormEvent } from "react";

import type { PasswordResetPayload } from "@/app/adapters";
import { Surface } from "@/components";

import {
  PASSWORD_RESET_MAX_LENGTH,
  PASSWORD_RESET_MIN_LENGTH,
  validateNewPassword,
} from "../model/passwordRecoveryValidation";

export type ResetPasswordFormProps = {
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onSubmit: (payload: PasswordResetPayload) => Promise<void> | void;
  token: string;
};

/**
 * Collects a new password for a recovery link. The token is passed in and only forwarded to the
 * adapter, so it is never rendered nor stored in the DOM.
 */
export function ResetPasswordForm({
  errorMessage = null,
  isSubmitting = false,
  onSubmit,
  token,
}: ResetPasswordFormProps) {
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errors, setErrors] = useState<{ confirmPassword?: string; newPassword?: string }>({});
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validateNewPassword({ confirmPassword, newPassword });

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      if (validationErrors.newPassword) {
        newPasswordRef.current?.focus();
      } else {
        confirmPasswordRef.current?.focus();
      }
      return;
    }

    void onSubmit({ newPassword, token });
  };

  const passwordInput = (
    field: "confirmPassword" | "newPassword",
    ref: React.Ref<HTMLInputElement>,
  ) => (
    <Input
      autoComplete="new-password"
      disabled={isSubmitting}
      maxLength={PASSWORD_RESET_MAX_LENGTH}
      onChange={(event) => {
        const value = event.currentTarget.value;
        if (field === "newPassword") {
          setNewPassword(value);
        } else {
          setConfirmPassword(value);
        }
        setErrors((current) => ({ ...current, [field]: undefined }));
      }}
      ref={ref}
      type={showPassword ? "text" : "password"}
      value={field === "newPassword" ? newPassword : confirmPassword}
    />
  );

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
              Recuperación de acceso
            </Text>
            <Heading as="h2" fontFamily="heading" fontSize={{ base: "2xl", md: "3xl" }}>
              Cree una contraseña nueva
            </Heading>
            <Text color="text.muted" lineHeight="1.7">
              Al guardarla, se cerrarán sus sesiones abiertas y podrá entrar con la nueva
              contraseña.
            </Text>
          </Stack>

          <Field.Root invalid={Boolean(errors.newPassword)} required>
            <Field.Label>Nueva contraseña</Field.Label>
            {passwordInput("newPassword", newPasswordRef)}
            <Field.HelperText>
              Debe tener entre {PASSWORD_RESET_MIN_LENGTH} y {PASSWORD_RESET_MAX_LENGTH} caracteres.
            </Field.HelperText>
            <Field.ErrorText>{errors.newPassword}</Field.ErrorText>
          </Field.Root>

          <Field.Root invalid={Boolean(errors.confirmPassword)} required>
            <Field.Label>Confirmar contraseña</Field.Label>
            {passwordInput("confirmPassword", confirmPasswordRef)}
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
            {isSubmitting ? "Restableciendo..." : "Restablecer contraseña"}
          </Button>
        </Stack>
      </form>
    </Surface>
  );
}
