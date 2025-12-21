"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@/types'
import { getProfile, refreshToken, handleDiscordCallback, setAccessToken as apiSetAccessToken, logout as apiLogout } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface MicContextValue {
  permission: boolean,
  stream: MediaStream | null
}

const MicContext = createContext<MicContextValue | undefined>(undefined)

export const MicProvider = ({ children }: { children: React.ReactNode }) => {
  const [permission, setHasPermission] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null);


  useEffect( () => {
      const getMicrophonePermission = async () => {
    if ("MediaRecorder" in window) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        setHasPermission(true);
        setStream(mediaStream);
      } catch (err: unknown) {
        if (err instanceof Error) {
          alert(err.message);
        } else {
          alert("An unknown error occurred while getting microphone permission.");
        }
      }
    } else {
      alert("The MediaRecorder API is not supported in your browser.");
    }
  };

  getMicrophonePermission();
  }, [])

  return (
    <MicContext.Provider value={{ permission, stream }}>
      {children}
    </MicContext.Provider>
  )
}

export function useMic() {
  const ctx = useContext(MicContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}
