import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Phone, PhoneOff, Video, Mic, MicOff } from "lucide-react";

const ENDPOINT = import.meta.env.VITE_BACKEND_URL;
let socket;

export default function VideoCallWindow({ onClose, chatId }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [localStream, setLocalStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  useEffect(() => {
    socket = io(ENDPOINT);

    // --- Get local media ---
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      })
      .catch((err) => console.error("Error accessing media devices:", err));

    socket.on("incoming-call", ({ fromUserId, callerSocketId }) => {
      createPeerConnection(callerSocketId, true);
    });

    socket.on("call-accepted", ({ answer }) => {
      peerConnection?.setRemoteDescription(answer);
    });

    socket.on("webrtc-offer", async ({ offer, fromSocketId }) => {
      if (!peerConnection) createPeerConnection(fromSocketId, false);
      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit("webrtc-answer", { toSocketId: fromSocketId, answer });
    });

    socket.on("webrtc-answer", async ({ answer }) => {
      await peerConnection?.setRemoteDescription(answer);
    });

    socket.on("webrtc-candidate", ({ candidate }) => {
      peerConnection?.addIceCandidate(candidate);
    });

    socket.on("call-ended", () => endCall());

    return () => {
      endCall();
      socket.disconnect();
    };
  }, []);

  const createPeerConnection = (remoteSocketId, isCaller) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    localStream
      ?.getTracks()
      .forEach((track) => pc.addTrack(track, localStream));

    const remoteStreamObj = new MediaStream();
    setRemoteStream(remoteStreamObj);
    if (remoteVideoRef.current)
      remoteVideoRef.current.srcObject = remoteStreamObj;

    pc.ontrack = (event) => {
      event.streams[0]
        .getTracks()
        .forEach((track) => remoteStreamObj.addTrack(track));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-candidate", {
          toSocketId: remoteSocketId,
          candidate: event.candidate,
        });
      }
    };

    setPeerConnection(pc);

    if (isCaller) {
      pc.createOffer().then((offer) =>
        pc.setLocalDescription(offer).then(() => {
          socket.emit("webrtc-offer", { toSocketId: remoteSocketId, offer });
        })
      );
    }
  };

  const toggleVideo = () => {
    localStream.getVideoTracks()[0].enabled = !videoEnabled;
    setVideoEnabled(!videoEnabled);
  };

  const toggleAudio = () => {
    localStream.getAudioTracks()[0].enabled = !audioEnabled;
    setAudioEnabled(!audioEnabled);
  };

  const endCall = () => {
    peerConnection?.close();
    localStream?.getTracks().forEach((track) => track.stop());
    setPeerConnection(null);
    setRemoteStream(null);
    setLocalStream(null);
    onClose();
    socket.emit("end-call", { toSocketId: chatId });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black">
      <div className="flex gap-4">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          className="w-48 h-36 bg-black"
        />
        <video ref={remoteVideoRef} autoPlay className="w-48 h-36 bg-black" />
      </div>

      <div className="mt-4 flex gap-4">
        <button onClick={toggleVideo}>
          {videoEnabled ? <Video /> : <Video className="line-through" />}
        </button>
        <button onClick={toggleAudio}>
          {audioEnabled ? <Mic /> : <MicOff />}
        </button>
        <button onClick={endCall}>
          <PhoneOff />
        </button>
      </div>
    </div>
  );
}
