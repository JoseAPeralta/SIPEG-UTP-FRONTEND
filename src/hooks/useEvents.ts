import { useEffect, useState } from "react";

import { getEvents, type EventCatalog } from "@/services/eventsService";

export type FetchEvents = () => Promise<EventCatalog>;

type EventsState = EventCatalog & {
  error: Error | null;
  isLoading: boolean;
};

const initialEventsState: EventsState = {
  error: null,
  isLoading: true,
  largeEvents: [],
  smallEvents: [],
};

export function useEvents(fetchEvents: FetchEvents = getEvents) {
  const [state, setState] = useState<EventsState>(initialEventsState);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let ignore = false;

    fetchEvents()
      .then((eventCatalog) => {
        if (!ignore) {
          setState({ ...eventCatalog, error: null, isLoading: false });
        }
      })
      .catch((error: unknown) => {
        if (!ignore) {
          setState((currentState) => ({
            ...currentState,
            error: error instanceof Error ? error : new Error("No se pudieron cargar los eventos"),
            isLoading: false,
          }));
        }
      });

    return () => {
      ignore = true;
    };
  }, [fetchEvents, requestVersion]);

  return {
    ...state,
    refetch: () => {
      setState((currentState) => ({ ...currentState, error: null, isLoading: true }));
      setRequestVersion((currentVersion) => currentVersion + 1);
    },
  };
}
