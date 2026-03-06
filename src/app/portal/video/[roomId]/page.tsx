"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  Loader2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};

const POLL_INTERVAL = 1500;

export default function PatientVideoCallPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { t } = useI18n();

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [callEnded, setCallEnded] = useState(false);

  // Media controls
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // WebRTC refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSignalTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInitRef = useRef(false);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);

  // ──────────────────────────────────────────────
  // Fetch room info
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    (async () => {
      try {
        const res = await fetch(`/api/portal/video-rooms/${roomId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch room.");
        if (data.room.status === "ended") {
          setCallEnded(true);
          setLoading(false);
          return;
        }
        setRoom(data.room);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [roomId]);

  // ──────────────────────────────────────────────
  // Init WebRTC as callee
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!room || hasInitRef.current) return;
    hasInitRef.current = true;
    initWebRTC();

    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const initWebRTC = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setConnected(true);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal("callee", "ice-candidate", event.candidate.toJSON());
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("🔗 Connection state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          setConnected(true);
        } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setConnected(false);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("🧊 ICE connection state:", pc.iceConnectionState);
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          setConnected(true);
        }
      };

      // Start polling for the offer from the caller
      startPolling(pc);
    } catch (err: any) {
      setError(
        err.name === "NotAllowedError"
          ? t("telehealth.cameraPermissionDenied")
          : err.message
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ──────────────────────────────────────────────
  // Signal helpers
  // ──────────────────────────────────────────────
  const sendSignal = async (from: string, type: string, data: any) => {
    try {
      await fetch(`/api/portal/video-rooms/${roomId}/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, type, data }),
      });
    } catch (err) {
      console.error("Failed to send signal:", err);
    }
  };

  const startPolling = (pc: RTCPeerConnection) => {
    if (pollTimerRef.current) return;
    lastSignalTimeRef.current = Date.now() - 60000; // look back 60s for the offer

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/portal/video-rooms/${roomId}/signal?role=callee&after=${lastSignalTimeRef.current}`
        );
        const data = await res.json();

        if (data.roomStatus === "ended") {
          setCallEnded(true);
          cleanup();
          return;
        }

        if (data.signals && data.signals.length > 0) {
          console.log(`📨 Received ${data.signals.length} signal(s) from caller`);
          for (const signal of data.signals) {
            console.log(`  - ${signal.type} from ${signal.from} at ${signal.createdAt}`);
            await handleRemoteSignal(signal, pc);
            lastSignalTimeRef.current = Math.max(
              lastSignalTimeRef.current,
              new Date(signal.createdAt).getTime()
            );
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, POLL_INTERVAL);
  };

  const handleRemoteSignal = async (signal: any, pc: RTCPeerConnection) => {
    try {
      if (signal.type === "offer") {
        console.log("📥 Received offer");
        await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
        console.log("✅ Set remote description (offer)");

        // Flush queued ICE candidates
        for (const candidate of iceCandidateQueueRef.current) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("✅ Added queued ICE candidate");
          } catch (err: any) {
            if (!err.message?.includes("duplicate")) {
              console.error("Error adding queued ICE candidate:", err);
            }
          }
        }
        iceCandidateQueueRef.current = [];

        // Create and send answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log("📤 Sending answer:", answer.type);
        await sendSignal("callee", "answer", answer);
      } else if (signal.type === "ice-candidate") {
        try {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.data));
            console.log("✅ Added ICE candidate");
          } else {
            iceCandidateQueueRef.current.push(signal.data);
            console.log("⏳ Queueing ICE candidate (waiting for remote description)");
          }
        } catch (err: any) {
          // Ignore duplicate ICE candidate errors
          if (err.message?.includes("duplicate")) {
            console.log("⚠️ Duplicate ICE candidate (ignored)");
          } else {
            console.error("Error adding ICE candidate:", err);
          }
        }
      }
    } catch (err) {
      console.error("Error handling signal:", err);
    }
  };

  // ──────────────────────────────────────────────
  // Controls
  // ──────────────────────────────────────────────
  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsMuted((v) => !v);
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsVideoOff((v) => !v);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const endCall = async () => {
    try {
      await fetch(`/api/portal/video-rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ended" }),
      });
    } catch {}
    setCallEnded(true);
    cleanup();
  };

  const cleanup = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
  };

  // ──────────────────────────────────────────────
  // Cleanup on unmount
  // ──────────────────────────────────────────────
  useEffect(() => {
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-400" />
          <p className="mt-3 text-sm text-slate-400">{t("telehealth.joiningCall")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="max-w-md text-center rounded-2xl bg-slate-900 p-8 ring-1 ring-slate-800">
          <VideoOff className="mx-auto h-12 w-12 text-rose-400 mb-4" />
          <h2 className="text-lg font-semibold text-slate-100 mb-2">{t("telehealth.error")}</h2>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => router.push("/portal/dashboard")}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            {t("portal.backToDashboard")}
          </button>
        </div>
      </div>
    );
  }

  if (callEnded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
            <PhoneOff className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-100">
            {t("telehealth.callEnded")}
          </h2>
          <p className="text-sm text-slate-400">
            {t("telehealth.callEndedDesc")}
          </p>
          <button
            onClick={() => router.push("/portal/dashboard")}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            {t("portal.backToDashboard")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-screen flex-col bg-slate-950"
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between bg-gradient-to-b from-slate-950/90 to-transparent px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-pulse"}`} />
          <span className="text-sm font-medium text-white">
            {connected
              ? `${t("telehealth.connectedWith")} ${room?.callerName || t("common.doctor")}`
              : t("telehealth.connectingToDoctor")}
          </span>
        </div>
      </div>

      {/* Video grid */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className={`grid w-full max-w-6xl gap-4 ${connected ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
          {/* Remote video (doctor) */}
          {connected && (
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900 shadow-2xl ring-1 ring-white/10">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-3 left-3 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {room?.callerName || t("common.doctor")}
              </div>
            </div>
          )}

          {/* Local video (patient) */}
          <div
            className={`relative overflow-hidden rounded-2xl bg-slate-900 shadow-2xl ring-1 ring-white/10 ${
              connected ? "aspect-video" : "mx-auto aspect-video max-w-2xl"
            }`}
          >
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`h-full w-full object-cover ${isVideoOff ? "hidden" : ""}`}
            />
            {isVideoOff && (
              <div className="flex h-full items-center justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800">
                  <VideoOff className="h-8 w-8 text-slate-500" />
                </div>
              </div>
            )}
            <div className="absolute bottom-3 left-3 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {t("telehealth.you")}
            </div>
            {isMuted && (
              <div className="absolute top-3 right-3 rounded-full bg-rose-500/80 p-1.5">
                <MicOff className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-3 bg-gradient-to-t from-slate-950/90 to-transparent px-6 py-6">
        <button
          onClick={toggleMute}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
            isMuted
              ? "bg-rose-500 text-white hover:bg-rose-600"
              : "bg-slate-800/80 text-white hover:bg-slate-700"
          }`}
          title={isMuted ? t("telehealth.unmute") : t("telehealth.mute")}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
            isVideoOff
              ? "bg-rose-500 text-white hover:bg-rose-600"
              : "bg-slate-800/80 text-white hover:bg-slate-700"
          }`}
          title={isVideoOff ? t("telehealth.turnOnCamera") : t("telehealth.turnOffCamera")}
        >
          {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </button>

        <button
          onClick={toggleFullscreen}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/80 text-white transition hover:bg-slate-700"
          title={t("telehealth.fullscreen")}
        >
          {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </button>

        <button
          onClick={endCall}
          className="flex h-12 w-14 items-center justify-center rounded-full bg-rose-600 text-white transition hover:bg-rose-700"
          title={t("telehealth.endCall")}
        >
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
