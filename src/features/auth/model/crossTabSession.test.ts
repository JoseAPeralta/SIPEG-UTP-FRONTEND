import { describe, expect, it, vi } from "vitest";

import { createCrossTabSessionBus, type CrossTabMessage } from "./crossTabSession.js";

/**
 * Solo se ejercitan `postMessage`, `close` y `onmessage`, asi que el stub no
 * implementa el `BroadcastChannel` completo: se castea en el factory.
 */
type ChannelStub = {
  postMessage: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
};

const channelStub = (): ChannelStub => ({ postMessage: vi.fn(), close: vi.fn(), onmessage: null });

const channelFactory = (channel: ChannelStub) => (): BroadcastChannel =>
  channel as unknown as BroadcastChannel;

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe("createCrossTabSessionBus", () => {
  it("keeps authentication usable when the browser denies the channel", () => {
    const bus = createCrossTabSessionBus({
      channelFactory: () => {
        throw new Error("denied");
      },
    });
    expect(() => bus.publish({ kind: "session-established" })).not.toThrow();
    bus.close();
  });

  it("does not propagate a channel publication failure", () => {
    const channel = channelStub();
    channel.postMessage.mockImplementation(() => {
      throw new Error("closed");
    });
    const bus = createCrossTabSessionBus({ channelFactory: channelFactory(channel) });
    expect(() => bus.publish({ kind: "session-ended" })).not.toThrow();
    bus.close();
  });
  it("does nothing when BroadcastChannel is unavailable", () => {
    const bus = createCrossTabSessionBus({ channelFactory: () => undefined });

    expect(() => {
      bus.publish({ kind: "session-established" });
    }).not.toThrow();
    bus.close();
  });

  it("publishes to the shared channel so other tabs receive it", () => {
    const channel = channelStub();
    const bus = createCrossTabSessionBus({ channelFactory: channelFactory(channel) });

    bus.publish({ kind: "session-ended" });

    // El navegador no hace eco al mismo contexto que publica, asi que esta
    // pestana no se reavisa a si misma. Excluirla aqui seria redundante.
    expect(channel.postMessage).toHaveBeenCalledWith({ kind: "session-ended" });
    bus.close();
  });

  it("delivers messages from other tabs to the subscriber", async () => {
    const channel = channelStub();
    const bus = createCrossTabSessionBus({ channelFactory: channelFactory(channel) });
    const received: CrossTabMessage[] = [];
    const unsubscribe = bus.subscribe((message) => received.push(message));

    // Se entrega lo que otra pestana publico por el canal compartido.
    bus.deliver({ kind: "session-ended" });
    await flush();

    expect(received).toEqual([{ kind: "session-ended" }]);
    unsubscribe();
    bus.close();
  });

  it("stops delivering after unsubscribe", () => {
    const channel = channelStub();
    const bus = createCrossTabSessionBus({ channelFactory: channelFactory(channel) });
    const received: CrossTabMessage[] = [];
    const unsubscribe = bus.subscribe((message) => received.push(message));

    bus.deliver({ kind: "session-ended" });
    unsubscribe();
    bus.deliver({ kind: "session-established" });

    expect(received).toHaveLength(1);
    bus.close();
  });

  it("ignores malformed messages instead of breaking the session", () => {
    const channel = channelStub();
    const bus = createCrossTabSessionBus({ channelFactory: channelFactory(channel) });
    const received: CrossTabMessage[] = [];
    bus.subscribe((message) => received.push(message));

    expect(() => {
      bus.deliver({ kind: "inventado" });
      bus.deliver(null);
      bus.deliver("texto");
    }).not.toThrow();
    expect(received).toHaveLength(0);
    bus.close();
  });

  it("tolerates a subscriber that throws, keeping the others alive", () => {
    const channel = channelStub();
    const bus = createCrossTabSessionBus({ channelFactory: channelFactory(channel) });
    const received: CrossTabMessage[] = [];

    bus.subscribe(() => {
      throw new Error("suscriptor roto");
    });
    bus.subscribe((message) => received.push(message));

    expect(() => {
      bus.deliver({ kind: "session-ended" });
    }).not.toThrow();
    expect(received).toHaveLength(1);
    bus.close();
  });

  it("closes the channel on close", () => {
    const channel = channelStub();
    const bus = createCrossTabSessionBus({ channelFactory: channelFactory(channel) });

    bus.close();

    expect(channel.close).toHaveBeenCalled();
  });
});
