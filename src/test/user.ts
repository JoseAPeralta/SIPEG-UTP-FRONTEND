import userEvent from "@testing-library/user-event";

export type UserEventOptions = Parameters<typeof userEvent.setup>[0];

export function setupUser(options: UserEventOptions = {}) {
  return userEvent.setup({ delay: null, pointerEventsCheck: 0, ...options });
}
