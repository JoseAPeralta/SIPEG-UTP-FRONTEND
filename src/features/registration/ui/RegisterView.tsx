import { Button } from "@chakra-ui/react";
import { Link } from "react-router";

import { AsyncStateView, FeedbackState } from "@/components";

import { useRegisterUser } from "../hooks/useRegisterUser";
import { useRegistrationCatalog } from "../hooks/useRegistrationCatalog";

import { RegisterForm } from "./RegisterForm";

export function RegisterView() {
  const catalogQuery = useRegistrationCatalog();
  const registration = useRegisterUser();

  if (registration.result) {
    return (
      <FeedbackState
        action={
          <Button asChild colorPalette="terracotta" rounded="full">
            <Link to="/login">Ir a iniciar sesión</Link>
          </Button>
        }
        description="Revise su correo electrónico y verifique su cuenta antes de iniciar sesión."
        padding="roomy"
        title="Cuenta creada correctamente"
        titleSize="lg"
      />
    );
  }

  return (
    <AsyncStateView
      error={catalogQuery.error}
      isLoading={catalogQuery.isLoading}
      onRetry={catalogQuery.refetch}
    >
      {catalogQuery.catalog ? (
        <RegisterForm
          careers={catalogQuery.catalog.careers}
          errorMessage={registration.errorMessage}
          isSubmitting={registration.isPending}
          onSubmit={async (payload) => {
            try {
              await registration.register(payload);
            } catch {
              // The mutation exposes a safe form-level message above.
            }
          }}
          organizationalUnits={catalogQuery.catalog.organizationalUnits}
        />
      ) : null}
    </AsyncStateView>
  );
}
