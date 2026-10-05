import { Button, Field, Heading, Input, Link, Stack, Text } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";
import { Link as RouterLink } from "react-router";

import type { AuthCredentials } from "@/app/adapters";
import { Surface } from "@/components";

export type LoginFormProps = {
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onSubmit: (credentials: AuthCredentials) => Promise<void> | void;
};

/** Collects credentials for the real API login flow and reports form-level authentication errors. */
export function LoginForm({ errorMessage = null, isSubmitting = false, onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSubmit({ email: email.trim(), password });
  };

  return (
    <Surface elevation="overlay" padding="roomy">
      <form onSubmit={handleSubmit}>
        <Stack gap={6}>
          <Stack gap={3}>
            <Text
              color="accent.solid"
              fontSize="sm"
              fontWeight="800"
              letterSpacing="0.14em"
              textTransform="uppercase"
            >
              Acceso a su cuenta
            </Text>
            <Heading as="h1" fontFamily="heading" fontSize={{ base: "4xl", md: "5xl" }}>
              Iniciar sesión
            </Heading>
            <Text color="text.muted" lineHeight="1.7">
              Use las credenciales de su cuenta institucional para entrar a SIPEG.
            </Text>
            <Text color="text.muted" fontSize="sm" lineHeight="1.7">
              Si acaba de registrarse, revise su correo electrónico para verificar su cuenta antes
              de iniciar sesión.
            </Text>
          </Stack>

          <Stack gap={4}>
            <Field.Root required>
              <Field.Label>Correo electrónico</Field.Label>
              <Input
                autoComplete="email"
                disabled={isSubmitting}
                onChange={(event) => setEmail(event.currentTarget.value)}
                type="email"
                value={email}
              />
            </Field.Root>

            <Field.Root required>
              <Field.Label>Contraseña</Field.Label>
              <Input
                autoComplete="current-password"
                disabled={isSubmitting}
                onChange={(event) => setPassword(event.currentTarget.value)}
                type="password"
                value={password}
              />
            </Field.Root>
          </Stack>

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
              {isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>
            <Link asChild color="accent.solid" fontWeight="600" textDecoration="underline">
              <RouterLink to="/forgot-password">¿Olvidó su contraseña?</RouterLink>
            </Link>
          </Stack>
        </Stack>
      </form>
    </Surface>
  );
}
