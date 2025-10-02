import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react";

const ENDPOINT = import.meta.env.VITE_BACKEND_URL;

export default function VideoCallWindow({ onClose, chatId, isCaller }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState("connecting");

  useEffect(() => {
    initializeCall();

    return () => {
      cleanup();
    };
  }, []);

  const initializeCall = async () => {
    try {
      // Initialize socket
      socketRef.current = io(ENDPOINT);

      // Get local media first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Setup socket listeners
      setupSocketListeners();

      // Join the call room
      socketRef.current.emit("join-call-room", { chatId });

      setCallStatus("ready");
    } catch (err) {
      console.error("Error accessing media devices:", err);
      alert("Could not access camera/microphone");
      onClose();
    }
  };

  const setupSocketListeners = () => {
    const socket = socketRef.current;

    // When another user joins the call
    socket.on("user-joined-call", ({ userId, socketId }) => {
      console.log("User joined call:", socketId);
      // If we're the caller, initiate the offer
      if (isCaller) {
        createPeerConnection(socketId);
        makeOffer(socketId);
      }
    });

    // Receive offer from caller
    socket.on("webrtc-offer", async ({ offer, fromSocketId }) => {
      console.log("Received offer from:", fromSocketId);
      createPeerConnection(fromSocketId);
      await handleOffer(offer, fromSocketId);
    });

    // Receive answer from callee
    socket.on("webrtc-answer", async ({ answer, fromSocketId }) => {
      console.log("Received answer from:", fromSocketId);
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      }
    });

    // Receive ICE candidate
    socket.on("webrtc-candidate", async ({ candidate, fromSocketId }) => {
      console.log("Received ICE candidate from:", fromSocketId);
      if (peerConnectionRef.current && candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      }
    });

    // Call ended by other user
    socket.on("call-ended", ({ fromSocketId }) => {
      console.log("Call ended by:", fromSocketId);
      cleanup();
      onClose();
    });
  };

  const createPeerConnection = (remoteSocketId) => {
    console.log("Creating peer connection for:", remoteSocketId);

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    // Add local stream tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log("Received remote track:", event.streams[0]);
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setCallStatus("connected");
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate to:", remoteSocketId);
        socketRef.current.emit("webrtc-candidate", {
          toSocketId: remoteSocketId,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setCallStatus("connected");
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        setCallStatus("disconnected");
      }
    };

    peerConnectionRef.current = pc;
  };

  const makeOffer = async (remoteSocketId) => {
    try {
      const pc = peerConnectionRef.current;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log("Sending offer to:", remoteSocketId);
      socketRef.current.emit("webrtc-offer", {
        toSocketId: remoteSocketId,
        offer: offer,
      });
    } catch (err) {
      console.error("Error making offer:", err);
    }
  };

  const handleOffer = async (offer, fromSocketId) => {
    try {
      const pc = peerConnectionRef.current;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log("Sending answer to:", fromSocketId);
      socketRef.current.emit("webrtc-answer", {
        toSocketId: fromSocketId,
        answer: answer,
      });
    } catch (err) {
      console.error("Error handling offer:", err);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled;
        setVideoEnabled(!videoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled;
        setAudioEnabled(!audioEnabled);
      }
    }
  };

  const endCall = () => {
    // Notify other user
    socketRef.current?.emit("end-call", { chatId });
    cleanup();
    onClose();
  };

  const cleanup = () => {
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop all local tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black">
      {/* Status indicator */}
      <div className="absolute top-4 left-4 text-white text-sm">
        Status: {callStatus}
      </div>

      {/* Videos */}
      <div className="flex flex-col items-center gap-4 w-full h-full p-4">
        {/* Remote video (large) */}
        <div className="flex-1 w-full max-w-4xl bg-gray-800 rounded-lg overflow-hidden relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {!remoteStream && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              Waiting for other participant...
            </div>
          )}
        </div>

        {/* Local video (small, picture-in-picture) */}
        <div className="absolute top-20 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden border-2 border-white">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 flex gap-4">
        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full ${
            videoEnabled ? "bg-gray-700" : "bg-red-600"
          } text-white hover:opacity-80 transition`}
        >
          {videoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
        </button>
        <button
          onClick={toggleAudio}
          className={`p-4 rounded-full ${
            audioEnabled ? "bg-gray-700" : "bg-red-600"
          } text-white hover:opacity-80 transition`}
        >
          {audioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
        </button>
        <button
          onClick={endCall}
          className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
}
