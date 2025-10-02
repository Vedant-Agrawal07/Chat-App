import React, { useEffect, useRef, useState } from "react";
import { Box, IconButton } from "@chakra-ui/react";
import { X } from "lucide-react";
import { ChatState } from "../Context/ChatProvider.jsx";
import io from "socket.io-client";

const ENDPOINT = import.meta.env.VITE_BACKEND_URL;
let socket;

export default function VideoCallWindow({ onClose, chatId, remoteSocketId }) {
  const { user } = ChatState();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);

  const [stream, setStream] = useState(null);

  useEffect(() => {
    socket = io(ENDPOINT);

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((mediaStream) => {
        setStream(mediaStream);
        if (localVideoRef.current)
          localVideoRef.current.srcObject = mediaStream;

        pcRef.current = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        // Add local tracks to PeerConnection
        mediaStream
          .getTracks()
          .forEach((track) => pcRef.current.addTrack(track, mediaStream));

        // Handle remote stream
        pcRef.current.ontrack = (event) => {
          if (remoteVideoRef.current)
            remoteVideoRef.current.srcObject = event.streams[0];
        };

        // Send ICE candidates
        pcRef.current.onicecandidate = (event) => {
          if (event.candidate && remoteSocketId) {
            socket.emit("webrtc-candidate", {
              toSocketId: remoteSocketId,
              candidate: event.candidate,
            });
          }
        };
      });

    // Listen for incoming WebRTC events
    socket.on("webrtc-offer", async ({ offer, fromSocketId }) => {
      await pcRef.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit("webrtc-answer", { toSocketId: fromSocketId, answer });
    });

    socket.on("webrtc-answer", async ({ answer }) => {
      await pcRef.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    });

    socket.on("webrtc-candidate", async ({ candidate }) => {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error(err);
      }
    });

    socket.on("call-ended", () => {
      cleanup();
    });

    return () => cleanup();
  }, []);

  const cleanup = () => {
    if (pcRef.current) pcRef.current.close();
    if (stream) stream.getTracks().forEach((track) => track.stop());
    onClose();
  };

  const handleEndCall = () => {
    if (remoteSocketId) socket.emit("end-call", { toSocketId: remoteSocketId });
    cleanup();
  };

  return (
    <Box
      position="fixed"
      top="10%"
      left="10%"
      w="80%"
      h="80%"
      bg="black"
      zIndex={9999}
      borderRadius="md"
      overflow="hidden"
    >
      <video
        ref={localVideoRef}
        autoPlay
        muted
        style={{
          width: "30%",
          position: "absolute",
          top: 10,
          right: 10,
          borderRadius: 8,
        }}
      />
      <video
        ref={remoteVideoRef}
        autoPlay
        style={{ width: "100%", height: "100%" }}
      />
      <IconButton
        icon={<X />}
        position="absolute"
        top={2}
        right={2}
        onClick={handleEndCall}
        colorScheme="red"
      />
    </Box>
  );
}
