import { useEffect, useRef, useState, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuthStore } from '@/store/authStore'

const WS_URL =
  (import.meta as any)?.env?.VITE_WS_URL || 'http://localhost:8080/api/ws'

function normalizeId(id: any): string {
  if (!id) return ''
  if (typeof id === 'string') return id
  if (id.$oid) return id.$oid
  if (id._id) return normalizeId(id._id)
  if (id.id) return normalizeId(id.id)
  return String(id)
}

export function useWebSocket(
  groupId: string,
  onMessage: (msg: any) => void,
) {
  const token = useAuthStore(s => s.accessToken)
  const [connected, setConnected] = useState(false)
  const clientRef = useRef<Client | null>(null)
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    if (!groupId) return

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 3000,
      debug: () => {},
      connectHeaders: token
        ? { Authorization: `Bearer ${token}` }
        : {},

      onConnect: () => {
        setConnected(true)

        client.subscribe(
          `/topic/group.${groupId}`,
          frame => {
            try {
              const parsed = JSON.parse(frame.body)

              onMessageRef.current({
                ...parsed,
                id: normalizeId(parsed?._id ?? parsed?.id),
                senderId: normalizeId(parsed?.senderId),
                groupId: normalizeId(parsed?.groupId),
                replyTo: parsed?.replyTo ?? null,
                attachments: Array.isArray(parsed?.attachments) ? parsed.attachments : [],
                reactions: Array.isArray(parsed?.reactions) ? parsed.reactions : [],
                mentionUserIds: Array.isArray(parsed?.mentionUserIds) ? parsed.mentionUserIds : [],
                pinned: !!parsed?.pinned,
                recalled: !!parsed?.recalled,
              })
            } catch {
              //
            }
          },
          token
            ? { Authorization: `Bearer ${token}` }
            : {},
        )
      },

      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
      onWebSocketError: () => setConnected(false),
      onWebSocketClose: () => setConnected(false),
    })

    client.activate()
    clientRef.current = client

    return () => {
      setConnected(false)
      try {
        client.deactivate()
      } catch {
        //
      }
      clientRef.current = null
    }
  }, [groupId, token])

  const publish = useCallback(
    (destination: string, body: any) => {
      const client = clientRef.current
      if (!client || !client.connected) return false

      client.publish({
        destination,
        body: JSON.stringify(body),
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
      })

      return true
    },
    [token],
  )

  return {
    connected,
    publish,
    client: clientRef.current,
  }
}