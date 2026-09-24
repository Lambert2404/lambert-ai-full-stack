import { useCallback, useEffect, useRef, useState } from 'react'

interface UseVoiceInputOptions {
  onResult: (text: string) => void
}

interface UseVoiceInputResult {
  isSupported: boolean
  isListening: boolean
  isSpeaking: boolean
  permissionDenied: boolean
  toggle: () => void
  speak: (text: string) => void
  stopSpeaking: () => void
}

// Minimal shape of the non-standard SpeechRecognition API, kept local so we
// don't need an extra @types package for a browser-only, optional feature.
interface MinimalSpeechRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

export function useVoiceInput({ onResult }: UseVoiceInputOptions): UseVoiceInputResult {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null)

  const SpeechRecognitionCtor =
    typeof window !== 'undefined'
      ? (window as unknown as { SpeechRecognition?: new () => MinimalSpeechRecognition; webkitSpeechRecognition?: new () => MinimalSpeechRecognition }).SpeechRecognition ??
        (window as unknown as { webkitSpeechRecognition?: new () => MinimalSpeechRecognition }).webkitSpeechRecognition
      : undefined

  const isSupported = !!SpeechRecognitionCtor

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      window.speechSynthesis?.cancel()
    }
  }, [])

  const toggle = useCallback(() => {
    if (!isSupported || !SpeechRecognitionCtor) return

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript
      if (transcript) onResult(transcript)
    }
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setPermissionDenied(true)
      }
      setIsListening(false)
    }
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    setPermissionDenied(false)
    try {
      recognition.start()
      setIsListening(true)
    } catch {
      setIsListening(false)
    }
  }, [isListening, isSupported, SpeechRecognitionCtor, onResult])

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  return { isSupported, isListening, isSpeaking, permissionDenied, toggle, speak, stopSpeaking }
}
