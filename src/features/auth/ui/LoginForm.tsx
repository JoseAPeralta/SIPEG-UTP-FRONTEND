import { Button, Field, Heading, Input, Stack, Text } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";

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
              Acceso administrativo
            </Text>
            <Heading as="h1" fontFamily="heading" fontSize={{ base: "4xl", md: "5xl" }}>
              Iniciar sesion en SIPEG
            </Heading>
            <Text color="text.muted" lineHeight="1.7">
              Use las credenciales de su cuenta institucional para acceder al panel operativo.
            </Text>
          </Stack>

          <Stack gap={4}>
            <Field.Root required>
              <Field.Label>Correo electronico</Field.Label>
              <Input
                autoComplete="email"
                disabled={isSubmitting}
                onChange={(event) => setEmail(event.currentTarget.value)}
                type="email"
                value={email}
              />
            </Field.Root>

            <Field.Root required>
              <Field.Label>Contrasena</Field.Label>
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

          <Button
            colorPalette="terracotta"
            disabled={isSubmitting}
            rounded="full"
            size="lg"
            type="submit"
          >
            {isSubmitting ? "Iniciando sesion..." : "Iniciar sesion"}
          </Button>
        </Stack>
      </form>
    </Surface>
  );
}
