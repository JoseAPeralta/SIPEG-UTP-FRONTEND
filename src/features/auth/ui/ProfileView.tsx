import type { ProfileUpdateRequest } from "@/app/adapters/contracts";
import { AsyncStateView } from "@/components";
import { useRegistrationCatalog } from "@/features/registration";
import { useSessionStore } from "@/store/session";

import { useProfile } from "../hooks/useProfile";
import type { ProfileUpdateFailure } from "../adapters/profileUpdateFailure";

import { ProfileForm } from "./ProfileForm";

const FAILURE_MESSAGES: Record<ProfileUpdateFailure, string> = {
  conflict: "Otra sesión actualizó su perfil. Revise los datos e intente de nuevo.",
  invalid: "Revise los datos enviados. La unidad o la carrera ya no están disponibles.",
  notFound: "No fue posible encontrar su cuenta. Inicie sesión nuevamente para continuar.",
  unauthenticated: "Su sesión no está autorizada. Inicie sesión nuevamente para continuar.",
  unknown: "No fue posible guardar su perfil. Intente de nuevo en unos minutos.",
};

/**
 * Connects the profile form to the institutional catalogs and to the authenticated session. The
 * profile is read from the session store, which already holds the validated `GET /users/me` result,
 * so the private profile is never duplicated into a query cache. The form is remounted with a key
 * derived from the stored profile so a successful update re-prefills it from the new truth.
 */
export function ProfileView() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const catalog = useRegistrationCatalog();
  const profile = useProfile();

  if (!currentUser) {
    return null;
  }

  const profileSignature = [
    currentUser.career?.id ?? "",
    currentUser.firstName,
    currentUser.lastName,
    currentUser.unit?.id ?? "",
  ].join("|");

  const handleSubmit = async (request: ProfileUpdateRequest) => {
    try {
      await profile.updateProfile(request);
    } catch {
      // The mutation exposes a localized form-level message below.
    }
  };

  return (
    <AsyncStateView error={catalog.error} isLoading={catalog.isLoading} onRetry={catalog.refetch}>
      {catalog.catalog ? (
        <ProfileForm
          careers={catalog.catalog.careers}
          errorMessage={profile.failure ? FAILURE_MESSAGES[profile.failure] : null}
          isSubmitting={profile.isPending}
          key={profileSignature}
          onSubmit={handleSubmit}
          organizationalUnits={catalog.catalog.organizationalUnits}
          profile={currentUser}
          successMessage={
            profile.isSuccess ? "Su perfil fue actualizado. Los cambios ya están vigentes." : null
          }
        />
      ) : null}
    </AsyncStateView>
  );
}
