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
  Monitor,
  Loader2,
  Copy,
  Check,
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

export default function VideoCallPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { t } = useI18n();

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);

  // Media controls
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  // WebRTC refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSignalTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const iCallerRef = useRef(false);
  const hasInitRef = useRef(false);

  // ──────────────────────────────────────────────
  // Fetch room info
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    (async () => {
      try {
        const res = await fetch(`/api/video-rooms/${roomId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch room.");
        setRoom(data.room);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [roomId]);

  // ──────────────────────────────────────────────
  // Determine caller/callee & init WebRTC
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!room || hasInitRef.current) return;
    hasInitRef.current = true;

    // The room creator is the caller
    iCallerRef.current = true;
    initWebRTC();

    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  // ──────────────────────────────────────────────
  // Init WebRTC
  // ──────────────────────────────────────────────
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

      // Add local tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log("🎥 Received remote track:", event.track.kind, event.streams.length);
        let remoteStream: MediaStream | null = null;
        
        if (event.streams && event.streams.length > 0) {
          remoteStream = event.streams[0];
          console.log("📹 Setting remote stream with", remoteStream.getTracks().length, "tracks");
        } else if (event.track) {
          // Fallback: create a stream from the track
          console.log("📹 Creating stream from track");
          remoteStream = new MediaStream([event.track]);
        }

        if (remoteStream && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          setHasRemoteStream(true);
          setConnected(true);
          
          // Ensure video plays
          remoteVideoRef.current.play().catch((err) => {
            console.error("Error playing remote video:", err);
          });

          // Log track info
          remoteStream.getTracks().forEach((track) => {
            console.log(`  Track: ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
            track.onended = () => {
              console.log(`  Track ended: ${track.kind}`);
            };
          });
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal("caller", "ice-candidate", event.candidate.toJSON());
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

      // Caller creates offer and waits
      if (iCallerRef.current) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log("📤 Sending offer:", offer.type);
        await sendSignal("caller", "offer", offer);
      }

      // Start polling for signals from the other party
      startPolling();

      // Check for existing remote streams (in case ontrack fired before handler was set)
      setTimeout(() => {
        if (pc.getReceivers().length > 0) {
          console.log("🔍 Found existing receivers, checking for streams...");
          const receivers = pc.getReceivers();
          const tracks = receivers.map((r) => r.track).filter((t) => t !== null) as MediaStreamTrack[];
          if (tracks.length > 0 && remoteVideoRef.current) {
            const remoteStream = new MediaStream(tracks);
            remoteVideoRef.current.srcObject = remoteStream;
            setHasRemoteStream(true);
            setConnected(true);
            remoteVideoRef.current.play().catch((err) => {
              console.error("Error playing remote video:", err);
            });
            console.log("✅ Set remote stream from existing receivers");
          }
        }
      }, 1000);
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
      await fetch(`/api/video-rooms/${roomId}/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, type, data }),
      });
    } catch (err) {
      console.error("Failed to send signal:", err);
    }
  };

  const startPolling = () => {
    if (pollTimerRef.current) return;
    // Look back 30 seconds to catch any signals sent before polling started
    lastSignalTimeRef.current = Date.now() - 30000;

    pollTimerRef.current = setInterval(async () => {
      try {
        const role = iCallerRef.current ? "caller" : "callee";
        const res = await fetch(
          `/api/video-rooms/${roomId}/signal?role=${role}&after=${lastSignalTimeRef.current}`
        );
        const data = await res.json();

        if (data.roomStatus === "ended") {
          setCallEnded(true);
          cleanup();
          return;
        }

        if (data.signals && data.signals.length > 0) {
          console.log(`📨 Received ${data.signals.length} signal(s) from callee`);
          for (const signal of data.signals) {
            console.log(`  - ${signal.type} from ${signal.from} at ${signal.createdAt}`);
            await handleRemoteSignal(signal);
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

  const handleRemoteSignal = async (signal: any) => {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      if (signal.type === "answer") {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
          console.log("✅ Set remote description (answer)");
        }
      } else if (signal.type === "ice-candidate") {
        try {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.data));
            console.log("✅ Added ICE candidate");
          } else {
            // Queue ICE candidates if remote description not set yet
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

  const toggleScreenShare = async () => {
    const pc = pcRef.current;
    if (!pc) return;

    if (isScreenSharing) {
      // Stop screen sharing, switch back to camera
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;

      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(videoTrack);
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        screenStreamRef.current = screenStream;

        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(screenTrack);

        screenTrack.onended = () => {
          toggleScreenShare();
        };
        setIsScreenSharing(true);
      } catch {
        // User cancelled screen share dialog
      }
    }
  };

  const endCall = async () => {
    try {
      await fetch(`/api/video-rooms/${roomId}`, {
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
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const copyLink = () => {
    const link = `${window.location.origin}/portal/video/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ──────────────────────────────────────────────
  // Ensure remote video plays when stream is set
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (hasRemoteStream && remoteVideoRef.current && remoteVideoRef.current.srcObject) {
      remoteVideoRef.current.play().catch((err) => {
        console.error("Error playing remote video in effect:", err);
      });
    }
  }, [hasRemoteStream]);

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
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-400" />
          <p className="mt-3 text-sm text-slate-400">{t("telehealth.connecting")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="card max-w-md text-center">
          <VideoOff className="mx-auto h-12 w-12 text-rose-400 mb-4" />
          <h2 className="text-lg font-semibold text-slate-100 mb-2">{t("telehealth.error")}</h2>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <button onClick={() => router.back()} className="btn-primary">
            {t("common.back")}
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
            onClick={() => router.back()}
            className="btn-primary mx-auto"
          >
            {t("telehealth.backToClinic")}
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
            {connected ? t("telehealth.connected") : t("telehealth.waitingForPatient")}
          </span>
        </div>

        {/* Copy patient invite link */}
        {!connected && (
          <button
            onClick={copyLink}
            className="flex items-center gap-2 rounded-full bg-slate-800/80 px-4 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? t("telehealth.linkCopied") : t("telehealth.copyPatientLink")}
          </button>
        )}
      </div>

      {/* Video grid */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className={`grid w-full max-w-6xl gap-4 ${connected ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
          {/* Remote video (main view when connected) */}
          {connected && (
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900 shadow-2xl ring-1 ring-white/10">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted={false}
                className="h-full w-full object-cover"
                onLoadedMetadata={() => {
                  console.log("✅ Remote video metadata loaded");
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.play().catch((err) => {
                      console.error("Error playing after metadata load:", err);
                    });
                  }
                }}
                onPlay={() => {
                  console.log("▶️ Remote video started playing");
                }}
                onError={(e) => {
                  console.error("❌ Remote video error:", e);
                }}
              />
              <div className="absolute bottom-3 left-3 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {room?.calleeName || t("telehealth.patient")}
              </div>
            </div>
          )}

          {/* Local video */}
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
          onClick={toggleScreenShare}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
            isScreenSharing
              ? "bg-sky-500 text-white hover:bg-sky-600"
              : "bg-slate-800/80 text-white hover:bg-slate-700"
          }`}
          title={t("telehealth.screenShare")}
        >
          <Monitor className="h-5 w-5" />
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
