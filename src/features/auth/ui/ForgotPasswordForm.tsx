import { Button, Field, Heading, Input, Link, Stack, Text } from "@chakra-ui/react";
import { useRef, useState, type FormEvent } from "react";
import { Link as RouterLink } from "react-router";

import type { PasswordResetRequest } from "@/app/adapters";
import { Surface } from "@/components";

import { validatePasswordResetRequest } from "../model/passwordRecoveryValidation";

export type ForgotPasswordFormProps = {
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onSubmit: (request: PasswordResetRequest) => Promise<void> | void;
};

/**
 * Collects the address that should receive a recovery link. The page owns the confirmation copy so
 * the same neutral message can be shown for known and unknown addresses.
 */
export function ForgotPasswordForm({
  errorMessage = null,
  isSubmitting = false,
  onSubmit,
}: ForgotPasswordFormProps) {
  const emailFieldRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { email: validEmail, error } = validatePasswordResetRequest({ email });

    if (!validEmail) {
      setEmailError(error);
      emailFieldRef.current?.focus();
      return;
    }

    setEmailError(null);
    void onSubmit({ email: validEmail });
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
              Recuperación de acceso
            </Text>
            <Heading as="h2" fontFamily="heading" fontSize={{ base: "2xl", md: "3xl" }}>
              Recupere el acceso a su cuenta
            </Heading>
            <Text color="text.muted" lineHeight="1.7">
              Indique el correo con el que se registró. Le enviaremos un enlace para crear una
              contraseña nueva.
            </Text>
          </Stack>

          <Field.Root invalid={Boolean(emailError)} required>
            <Field.Label>Correo electrónico</Field.Label>
            <Input
              autoComplete="email"
              disabled={isSubmitting}
              maxLength={254}
              onChange={(event) => {
                setEmail(event.currentTarget.value);
                setEmailError(null);
              }}
              ref={emailFieldRef}
              type="email"
              value={email}
            />
            <Field.ErrorText>{emailError}</Field.ErrorText>
          </Field.Root>

          {errorMessage ? (
            <Text color="error.solid" fontSize="sm" role="alert">
              {errorMessage}
            </Text>
          ) : null}

          <Stack align={{ base: "stretch", md: "center" }} gap={4} justify="space-between">
            <Button
              alignSelf={{ base: "stretch", md: "start" }}
              colorPalette="terracotta"
              disabled={isSubmitting}
              rounded="full"
              size="lg"
              type="submit"
            >
              {isSubmitting ? "Enviando enlace..." : "Enviar enlace"}
            </Button>
            <Link asChild color="accent.solid" fontWeight="600" textDecoration="underline">
              <RouterLink to="/login">Volver a iniciar sesión</RouterLink>
            </Link>
          </Stack>
        </Stack>
      </form>
    </Surface>
  );
}
