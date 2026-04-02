"use client";

import { useRef, useState, useCallback } from "react";

/**
 * Hook for Gemini Live API real-time audio.
 *
 * Flow:
 * 1. Fetch ephemeral token from /api/voice/session
 * 2. Open WebSocket to Gemini Live
 * 3. Capture mic → downsample to 16kHz PCM → base64 → send
 * 4. Receive audio response → play via AudioContext
 * 5. Receive text transcript → callback
 *
 * Barge-in: if user speaks while AI plays, stop playback and listen.
 * Fallback: if connection fails, returns { fallback: true }
 */

// ── Types ────────────────────────────────────────────────────────────────────

interface GeminiLiveCallbacks {
  onTranscript: (text: string) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
  onError?: (error: string) => void;
}

interface GeminiLiveState {
  isConnected: boolean;
  isListening: boolean;
  isPlaying: boolean;
  fallback: boolean;
  /** Connect and start the session */
  start: (systemInstruction: string, callbacks: GeminiLiveCallbacks, persona?: string) => Promise<boolean>;
  /** Send text message to the model */
  sendText: (text: string) => void;
  /** Start mic capture */
  startMic: () => void;
  /** Stop mic capture */
  stopMic: () => void;
  /** Stop everything and disconnect */
  stop: () => void;
  /** Speak text via the Gemini Live session (text→audio) */
  speak: (text: string) => void;
}

// ── Audio helpers ────────────────────────────────────────────────────────────

function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

function downsample(buffer: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return buffer;
  const ratio = fromRate / toRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const idx = Math.round(i * ratio);
    result[i] = buffer[Math.min(idx, buffer.length - 1)];
  }
  return result;
}

function int16ToBase64(int16: Int16Array): string {
  const bytes = new Uint8Array(int16.buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGeminiLive(): GeminiLiveState {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fallback, setFallback] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const callbacksRef = useRef<GeminiLiveCallbacks | null>(null);
  const playQueueRef = useRef<AudioBufferSourceNode[]>([]);

  // ── Stop playback (barge-in) ──────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    for (const node of playQueueRef.current) {
      try { node.stop(); } catch { /* already stopped */ }
    }
    playQueueRef.current = [];
    setIsPlaying(false);
  }, []);

  // ── Play received audio ───────────────────────────────────────────────
  const playAudio = useCallback(async (base64Audio: string, mimeType: string) => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;

    try {
      const binaryStr = atob(base64Audio);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      playQueueRef.current.push(source);
      setIsPlaying(true);
      callbacksRef.current?.onAudioStart?.();

      source.onended = () => {
        playQueueRef.current = playQueueRef.current.filter(n => n !== source);
        if (playQueueRef.current.length === 0) {
          setIsPlaying(false);
          callbacksRef.current?.onAudioEnd?.();
        }
      };

      source.start();
    } catch (err) {
      console.error("[GeminiLive] Audio decode error:", err);
      setIsPlaying(false);
    }
  }, []);

  // ── Handle WebSocket messages ─────────────────────────────────────────
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);

      // Text response
      if (data.candidates) {
        for (const candidate of data.candidates) {
          if (candidate.content?.parts) {
            for (const part of candidate.content.parts) {
              if (part.text) {
                callbacksRef.current?.onTranscript(part.text);
              }
              if (part.audio?.data) {
                playAudio(part.audio.data, part.audio.mimeType || "audio/mpeg");
              }
            }
          }
        }
      }

      // Server content (SDK-style)
      if (data.serverContent?.modelTurn?.parts) {
        for (const part of data.serverContent.modelTurn.parts) {
          if (part.text) callbacksRef.current?.onTranscript(part.text);
          if (part.inlineData?.data) {
            playAudio(part.inlineData.data, part.inlineData.mimeType || "audio/mpeg");
          }
        }
      }
    } catch (err) {
      console.error("[GeminiLive] Message parse error:", err);
    }
  }, [playAudio]);

  // ── Start session ─────────────────────────────────────────────────────
  const start = useCallback(async (systemInstruction: string, callbacks: GeminiLiveCallbacks, persona?: string): Promise<boolean> => {
    callbacksRef.current = callbacks;

    try {
      // 1. Get ephemeral token (send persona for voice selection)
      const tokenRes = await fetch("/api/voice/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona }),
      });
      if (!tokenRes.ok) {
        console.error("[GeminiLive] Token fetch failed:", tokenRes.status);
        setFallback(true);
        return false;
      }
      const { token, model } = await tokenRes.json();
      if (!token) {
        setFallback(true);
        return false;
      }

      // 2. Open WebSocket
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${token}`;
      const ws = new WebSocket(wsUrl);

      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          console.error("[GeminiLive] WebSocket timeout");
          ws.close();
          setFallback(true);
          resolve(false);
        }, 10000);

        ws.onopen = () => {
          clearTimeout(timeout);
          wsRef.current = ws;
          setIsConnected(true);
          console.log("[GeminiLive] Connected");

          // Send setup message with system instruction
          ws.send(JSON.stringify({
            setup: {
              model: `models/${model}`,
              generationConfig: {
                responseModalities: ["AUDIO", "TEXT"],
                temperature: 0.7,
              },
              systemInstruction: {
                parts: [{ text: systemInstruction }],
              },
            },
          }));

          resolve(true);
        };

        ws.onmessage = handleMessage;

        ws.onerror = (e) => {
          clearTimeout(timeout);
          console.error("[GeminiLive] WebSocket error:", e);
          setFallback(true);
          resolve(false);
        };

        ws.onclose = () => {
          setIsConnected(false);
          setIsListening(false);
          wsRef.current = null;
        };
      });
    } catch (err) {
      console.error("[GeminiLive] Start error:", err);
      setFallback(true);
      return false;
    }
  }, [handleMessage]);

  // ── Send text ─────────────────────────────────────────────────────────
  const sendText = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      clientContent: {
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true,
      },
    }));
  }, []);

  // ── Speak (text → Gemini → audio response) ───────────────────────────
  const speak = useCallback((text: string) => {
    sendText(text);
  }, [sendText]);

  // ── Start mic ─────────────────────────────────────────────────────────
  const startMic = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Barge-in: stop any playing audio
    stopPlayback();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const ctx = audioCtxRef.current || new AudioContext();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // ScriptProcessorNode for capturing audio chunks
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const downsampled = downsample(inputData, ctx.sampleRate, 16000);
        const int16 = float32ToInt16(downsampled);
        const base64 = int16ToBase64(int16);

        wsRef.current.send(JSON.stringify({
          realtimeInput: {
            audio: {
              data: base64,
              mimeType: "audio/pcm;rate=16000",
            },
          },
        }));
      };

      source.connect(processor);
      processor.connect(ctx.destination); // required for onaudioprocess to fire
      setIsListening(true);
      console.log("[GeminiLive] Mic started");
    } catch (err) {
      console.error("[GeminiLive] Mic error:", err);
      setFallback(true);
      callbacksRef.current?.onError?.("Micro non disponible");
    }
  }, [stopPlayback]);

  // ── Stop mic ──────────────────────────────────────────────────────────
  const stopMic = useCallback(() => {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach(t => t.stop());
    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    setIsListening(false);

    // Signal end of audio stream
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        realtimeInput: { audioStreamEnd: true },
      }));
    }
  }, []);

  // ── Stop everything ───────────────────────────────────────────────────
  const stop = useCallback(() => {
    stopMic();
    stopPlayback();
    wsRef.current?.close();
    wsRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setIsConnected(false);
    setIsListening(false);
    setIsPlaying(false);
  }, [stopMic, stopPlayback]);

  return {
    isConnected,
    isListening,
    isPlaying,
    fallback,
    start,
    sendText,
    startMic,
    stopMic,
    stop,
    speak,
  };
}
