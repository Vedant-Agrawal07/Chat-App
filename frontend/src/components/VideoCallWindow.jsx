import { useEffect, useRef, useState } from "react";
import { Video, VideoOff, Mic, MicOff, PhoneOff } from "lucide-react";
import { io } from "socket.io-client";

const configuration = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
};

const ENDPOINT = "https://echo-chat-app-f5jz.onrender.com";
const socket = io(ENDPOINT);

let pc;

export default function VideoCallWindow({
  onClose,
  chatId,
  calleeSocketId,
  callerSocketId,
  isCaller,
}) {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  useEffect(() => {
    startCall();

    return () => hangup();
  }, []);

  async function startCall() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setLocalStream(stream);
    localVideo.current.srcObject = stream;

    pc = new RTCPeerConnection(configuration);
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("webrtc-candidate", {
          toSocketId: isCaller ? calleeSocketId : callerSocketId,
          candidate: e.candidate,
        });
      }
    };
    pc.ontrack = (e) => (remoteVideo.current.srcObject = e.streams[0]);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    if (isCaller) {
      // Caller creates offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc-offer", { toSocketId: calleeSocketId, offer });
    }

    // Listen for signaling messages
    socket.on("webrtc-offer", async ({ offer, fromSocketId }) => {
      if (!pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc-answer", { toSocketId: fromSocketId, answer });
      }
    });

    socket.on("webrtc-answer", async ({ answer }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("webrtc-candidate", async ({ candidate }) => {
      if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });
  }

  function toggleVideo() {
    localStream
      .getVideoTracks()
      .forEach((track) => (track.enabled = !track.enabled));
    setVideoEnabled(!videoEnabled);
  }

  function toggleAudio() {
    localStream
      .getAudioTracks()
      .forEach((track) => (track.enabled = !track.enabled));
    setAudioEnabled(!audioEnabled);
  }

  function hangup() {
    if (pc) {
      pc.close();
      pc = null;
    }
    localStream?.getTracks().forEach((t) => t.stop());
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center z-50">
      <div className="w-full h-full flex flex-col p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 mb-4">
          <div className="relative bg-slate-900/30 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 shadow-xl">
            <video
              ref={remoteVideo}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-slate-900/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
              <span className="text-white text-xs font-medium">Remote</span>
            </div>
          </div>
          <div className="relative bg-slate-900/30 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 shadow-xl">
            <video
              ref={localVideo}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-slate-900/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
              <span className="text-white text-xs font-medium">You</span>
            </div>
          </div>
        </div>
        <div className="flex justify-center">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl px-8 py-4 shadow-2xl">
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-xl transition-all duration-200 border ${
                  videoEnabled
                    ? "bg-slate-800/50 backdrop-blur-md border-white/20 hover:bg-slate-700/50"
                    : "bg-red-500/90 backdrop-blur-md border-red-400/30 hover:bg-red-500"
                }`}
              >
                {videoEnabled ? (
                  <Video className="w-5 h-5 text-white" />
                ) : (
                  <VideoOff className="w-5 h-5 text-white" />
                )}
              </button>
              <button
                onClick={toggleAudio}
                className={`p-4 rounded-xl transition-all duration-200 border ${
                  audioEnabled
                    ? "bg-slate-800/50 backdrop-blur-md border-white/20 hover:bg-slate-700/50"
                    : "bg-red-500/90 backdrop-blur-md border-red-400/30 hover:bg-red-500"
                }`}
              >
                {audioEnabled ? (
                  <Mic className="w-5 h-5 text-white" />
                ) : (
                  <MicOff className="w-5 h-5 text-white" />
                )}
              </button>
              <button
                onClick={hangup}
                className="p-4 rounded-xl bg-red-500/90 backdrop-blur-md border border-red-400/30 hover:bg-red-600 transition-all duration-200"
              >
                <PhoneOff className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
