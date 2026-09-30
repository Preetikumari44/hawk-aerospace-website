/** useSocketEvent — subscribe to a WS event, auto-cleanup */

import { useEffect, useRef } from 'react';
import { useSocket, type CLIENT_EVENTS } from '../context/SocketContext';

type EventName = typeof CLIENT_EVENTS[keyof typeof CLIENT_EVENTS];

/**
 * Subscribe to a socket event. Handler auto-cleaned on unmount.
 * @param event - CLIENT_EVENTS key
 * @param handler - callback with payload
 */
export function useSocketEvent<T = unknown>(
  event: EventName,
  handler: (payload: T) => void,
) {
  const { on } = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const unsub = on(event, (payload: T) => handlerRef.current(payload));
    return unsub;
  }, [event, on]);
}
