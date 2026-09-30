import type { SessionEndReason } from "@/types/domain";

/**
 * Localized copy for the login notice. The wording stays neutral on purpose: `expired` also covers a
 * deactivated account and an unverified email, because the contract exposes no way to tell them
 * apart and asserting a cause would reveal account state.
 */
export const SESSION_END_MESSAGES: Record<SessionEndReason, string> = {
  expired: "Su sesion expiro. Inicie sesion nuevamente para continuar.",
  throttled: "Ha realizado demasiados intentos. Espere un momento e intente de nuevo.",
  unavailable: "No fue posible restablecer su sesion. Intente iniciar sesion nuevamente.",
};
