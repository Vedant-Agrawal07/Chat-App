import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react";
import { ChatState } from "../Context/ChatProvider.jsx";

const ENDPOINT = import.meta.env.VITE_BACKEND_URL;

export default function VideoCallWindow({ onClose, chatId, isCaller }) {
  const { user } = ChatState();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  const [remoteStream, setRemoteStream] = useState(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState("initializing");

  useEffect(() => {
    console.log("=== VideoCallWindow mounted ===");
    console.log("Chat ID:", chatId);
    console.log("Is Caller:", isCaller);
    console.log("User:", user?.name);

    initializeCall();

    return () => {
      console.log("=== VideoCallWindow unmounting ===");
      cleanup();
    };
  }, []);

  const initializeCall = async () => {
    try {
      setCallStatus("getting media");
      console.log("Getting user media...");

      // Get local media first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      console.log("Got local stream:", stream.getTracks());
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize socket
      setCallStatus("connecting socket");
      socketRef.current = io(ENDPOINT);

      socketRef.current.on("connect", () => {
        console.log("Socket connected:", socketRef.current.id);

        // Setup all socket listeners
        setupSocketListeners();

        // Join the call room
        console.log("Joining call room:", chatId);
        socketRef.current.emit("join-call-room", { chatId });

        setCallStatus("waiting for peer");
      });
    } catch (err) {
      console.error("Error in initializeCall:", err);
      alert("Could not access camera/microphone: " + err.message);
      onClose();
    }
  };

  const setupSocketListeners = () => {
    const socket = socketRef.current;

    // When another user joins the call
    socket.on("user-joined-call", ({ socketId }) => {
      console.log(">>> User joined call! Socket ID:", socketId);
      setCallStatus("user joined");

      // Create peer connection
      createPeerConnection(socketId);

      // If we're the caller, initiate the offer
      if (isCaller) {
        console.log("I'm the caller, creating offer...");
        setTimeout(() => makeOffer(socketId), 1000); // Small delay to ensure PC is ready
      } else {
        console.log("I'm the callee, waiting for offer...");
      }
    });

    // Receive offer from caller
    socket.on("webrtc-offer", async ({ offer, fromSocketId }) => {
      console.log(">>> Received offer from:", fromSocketId);
      console.log("Offer SDP:", offer);

      if (!peerConnectionRef.current) {
        console.log("No peer connection exists, creating one...");
        createPeerConnection(fromSocketId);
        // Wait a bit for PC to be ready
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      await handleOffer(offer, fromSocketId);
    });

    // Receive answer from callee
    socket.on("webrtc-answer", async ({ answer, fromSocketId }) => {
      console.log(">>> Received answer from:", fromSocketId);
      console.log("Answer SDP:", answer);

      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
          console.log("✓ Remote description set successfully");
        } catch (err) {
          console.error("Error setting remote description:", err);
        }
      } else {
        console.error("No peer connection to set remote description!");
      }
    });

    // Receive ICE candidate
    socket.on("webrtc-candidate", async ({ candidate, fromSocketId }) => {
      console.log(">>> Received ICE candidate from:", fromSocketId);

      if (peerConnectionRef.current && candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
          console.log("✓ ICE candidate added");
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      }
    });

    // Call ended by other user
    socket.on("call-ended", ({ fromSocketId }) => {
      console.log(">>> Call ended by:", fromSocketId);
      cleanup();
      onClose();
    });
  };

  const createPeerConnection = (remoteSocketId) => {
    console.log("=== Creating peer connection for:", remoteSocketId, "===");

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      console.log("Adding local tracks to peer connection...");
      localStreamRef.current.getTracks().forEach((track) => {
        console.log("Adding track:", track.kind, track.label);
        pc.addTrack(track, localStreamRef.current);
      });
    } else {
      console.error("No local stream to add!");
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log(">>> ON TRACK EVENT! Received remote track");
      console.log("Track kind:", event.track.kind);
      console.log("Streams:", event.streams);

      if (event.streams && event.streams[0]) {
        console.log("Setting remote stream...");
        setRemoteStream(event.streams[0]);

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          console.log("✓ Remote video element updated");
        }

        setCallStatus("connected");
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(">>> Sending ICE candidate to:", remoteSocketId);
        socketRef.current.emit("webrtc-candidate", {
          toSocketId: remoteSocketId,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(">>> Connection state:", pc.connectionState);
      setCallStatus(pc.connectionState);

      if (pc.connectionState === "connected") {
        console.log("✓✓✓ PEER CONNECTION ESTABLISHED! ✓✓✓");
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        console.log("Connection lost or failed");
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(">>> ICE connection state:", pc.iceConnectionState);
    };

    peerConnectionRef.current = pc;
    console.log("✓ Peer connection created");
  };

  const makeOffer = async (remoteSocketId) => {
    console.log("=== Making offer to:", remoteSocketId, "===");

    try {
      const pc = peerConnectionRef.current;

      if (!pc) {
        console.error("No peer connection available!");
        return;
      }

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      console.log("Offer created:", offer);
      await pc.setLocalDescription(offer);
      console.log("✓ Local description set");

      console.log("Sending offer to:", remoteSocketId);
      socketRef.current.emit("webrtc-offer", {
        toSocketId: remoteSocketId,
        offer: offer,
      });
      console.log("✓ Offer sent");
    } catch (err) {
      console.error("Error making offer:", err);
    }
  };

  const handleOffer = async (offer, fromSocketId) => {
    console.log("=== Handling offer from:", fromSocketId, "===");

    try {
      const pc = peerConnectionRef.current;

      if (!pc) {
        console.error("No peer connection available!");
        return;
      }

      console.log("Setting remote description...");
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log("✓ Remote description set");

      console.log("Creating answer...");
      const answer = await pc.createAnswer();
      console.log("Answer created:", answer);

      await pc.setLocalDescription(answer);
      console.log("✓ Local description set");

      console.log("Sending answer to:", fromSocketId);
      socketRef.current.emit("webrtc-answer", {
        toSocketId: fromSocketId,
        answer: answer,
      });
      console.log("✓ Answer sent");
    } catch (err) {
      console.error("Error handling offer:", err);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled;
        setVideoEnabled(!videoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled;
        setAudioEnabled(!audioEnabled);
      }
    }
  };

  const endCall = () => {
    console.log("Ending call...");
    // Notify other user
    socketRef.current?.emit("end-call", { chatId });
    cleanup();
    onClose();
  };

  const cleanup = () => {
    console.log("Cleaning up...");

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop all local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log("Stopped track:", track.kind);
      });
      localStreamRef.current = null;
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
      <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-2 rounded">
        Status: {callStatus}
        <br />
        Role: {isCaller ? "Caller" : "Callee"}
        <br />
        Remote: {remoteStream ? "Connected ✓" : "Waiting..."}
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
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2">
              <div className="animate-pulse text-6xl">📹</div>
              <div>Waiting for other participant...</div>
              <div className="text-sm text-gray-400">
                Check browser console for details
              </div>
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
          <div className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-1 rounded">
            You
          </div>
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
