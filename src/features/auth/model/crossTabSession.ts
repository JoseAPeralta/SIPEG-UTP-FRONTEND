/**
 * Avisos entre pestanas de la misma aplicacion.
 *
 * La sesion ya no se propaga guardando un token: viaja en una cookie `HttpOnly`
 * que el navegador comparte sola. Lo que si necesita sincronizacion es que las pestanas
 * se enteren de los cambios, porque cada una tiene su access token en memoria y
 * su propia vista del estado:
 *
 * - `session-established`: otra pestana inicio sesion. Esta puede querer
 *   autenticarse sola llamando a `refresh`, que le devolvera la sesion existente.
 * - `session-renewed`: otra pestana renovo su access token. Esta va caducando y
 *  no necesita hacerlo ella misma.
 * - `session-ended`: hubo un logout. Todas cierran, o de lo contrario una
 *   pestana seguiría con un token aparentemente valido.
 *
 * `BroadcastChannel` no persiste nada, pero otros scripts del mismo origen
 * pueden leerlo: nunca contiene credenciales. Si no existe, el bus no emite y es
 * justo el comportamiento de antes: la sesion sigue siendo correcta porque la
 * cookie es la fuente de verdad, solo se pierde la convergencia instantanea.
 */
export type CrossTabMessage =
  { kind: "session-established" } | { kind: "session-renewed" } | { kind: "session-ended" };

const CHANNEL_NAME = "sipeg-auth";

const KINDS: ReadonlySet<string> = new Set([
  "session-established",
  "session-renewed",
  "session-ended",
]);

/**
 * Filtro de mensajes. Un canal es un medio controlado por otras pestanas (y por
 * cualquier script que se haya inyectado), asi que nada de lo que llegue se
 * asume con forma correcta antes de mirar el campo.
 */
export const isCrossTabMessage = (value: unknown): value is CrossTabMessage => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const { kind } = value as { kind?: unknown };

  return typeof kind === "string" && KINDS.has(kind);
};

export type CrossTabSessionBus = {
  publish: (message: CrossTabMessage) => void;
  subscribe: (listener: (message: CrossTabMessage) => void) => () => void;
  deliver: (value: unknown) => void;
  close: () => void;
};

export const createCrossTabSessionBus = (
  dependencies: {
    channelFactory?: () => BroadcastChannel | undefined;
    channelName?: string;
  } = {},
): CrossTabSessionBus => {
  const channelFactory =
    dependencies.channelFactory ??
    (() =>
      typeof BroadcastChannel === "undefined"
        ? undefined
        : new BroadcastChannel(dependencies.channelName ?? CHANNEL_NAME));

  let channel: BroadcastChannel | undefined;
  try {
    channel = channelFactory();
  } catch {
    // Algunos contextos restringen esta API. La cookie sigue permitiendo restaurar.
  }
  const listeners = new Set<(message: CrossTabMessage) => void>();

  if (channel) {
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (isCrossTabMessage(event.data)) {
        listeners.forEach((listener) => {
          try {
            listener(event.data as CrossTabMessage);
          } catch {
            // Un suscriptor roto no puede impedir que los demas se enteren.
          }
        });
      }
    };
  }

  return {
    // Publicar es para las OTRAS pestanas: el navegador no hace eco al mismo
    // contexto, pero es explicito aqui para que quede claro al leerlo.
    publish(message) {
      try {
        channel?.postMessage(message);
      } catch {
        // Un aviso fallido no convierte un login confirmado en un fallo.
      }
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    deliver(value) {
      if (isCrossTabMessage(value)) {
        listeners.forEach((listener) => {
          try {
            listener(value);
          } catch {
            // idem
          }
        });
      }
    },
    close() {
      listeners.clear();
      channel?.close();
    },
  };
};
