import React, { useEffect, useState } from "react";
import { Video } from "lucide-react";
import VideoCallWindow from "./VideoCallWindow.jsx";
import IncomingCallModal from "./IncomingCallModal.jsx";
import { ChatState } from "../Context/ChatProvider.jsx";
import {
  Box,
  FormControl,
  IconButton,
  Input,
  Spinner,
  Text,
  useToast,
} from "@chakra-ui/react";
import { getSender } from "./miscellaneous/MyChats.jsx";
import { ArrowBackIcon, ViewIcon } from "@chakra-ui/icons";
import ProfileModal from "./miscellaneous/ProfileModal.jsx";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal.jsx";
import axios from "axios";
import ScrollableChat from "./ScrollableChat.jsx";
import io from "socket.io-client";
import Lottie from "react-lottie";
import typingAnimation from "../animation/typingAnimation.json";

const ENDPOINT = import.meta.env.VITE_BACKEND_URL;
let socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const { user, SelectedChat, setSelectedChat, notification, setNotification } =
    ChatState();
  const getSingleChatUserName = () => getSender(user, SelectedChat.users);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [showCall, setShowCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [remoteSocketId, setRemoteSocketId] = useState(null);

  const toast = useToast();

  // Socket setup
  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user);

    socket.on("connected", () => console.log("Socket connected"));

    socket.on("receive-message", (message) => {
      if (
        !selectedChatCompare ||
        selectedChatCompare._id !== message.chat._id
      ) {
        if (!notification.some((notif) => notif._id === message._id))
          setNotification((prev) => [message, ...prev]);
        setFetchAgain(!fetchAgain);
      } else {
        setMessages((prev) =>
          !prev.some((m) => m._id === message._id) ? [...prev, message] : prev
        );
      }
    });

    // Incoming call with callerSocketId
    socket.on("incoming-call", ({ fromUserId, callerSocketId }) => {
      setIncomingCall({ fromUserId, callerSocketId });
    });

    return () => socket.disconnect();
  }, []);

  const displayAllMessages = async () => {
    if (!SelectedChat) return;
    setLoading(true);
    try {
      const config = { headers: { authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(
        `${ENDPOINT}/api/message/${SelectedChat._id}`,
        config
      );
      setMessages(data);
      socket.emit("joinChat", SelectedChat._id);
      setLoading(false);
    } catch (error) {
      toast({
        title: "Error occurred",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    displayAllMessages();
    selectedChatCompare = SelectedChat;
  }, [SelectedChat]);

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: typingAnimation,
    rendererSettings: { preserveAspectRatio: "xMidYMid slice" },
  };

  const handleVideoCall = () => {
    if (!SelectedChat) return;
    socket.emit("call-user", { fromUserId: user._id });
    setShowCall(true);
  };

  return (
    <>
      {SelectedChat ? (
        <>
          <Text
            fontSize={{ base: "27px", md: "30px" }}
            pb={3}
            px={2}
            w="100%"
            fontFamily="Work sans"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <IconButton
              display={{ base: "flex", md: "none" }}
              icon={<ArrowBackIcon />}
              onClick={() => setSelectedChat("")}
            />
            {SelectedChat.chatName === "sender" ? (
              <>
                {getSingleChatUserName()}
                <ProfileModal user={user} />
              </>
            ) : (
              <>
                {SelectedChat.chatName}
                <UpdateGroupChatModal
                  fetchAgain={fetchAgain}
                  setFetchAgain={setFetchAgain}
                  displayAllMessages={displayAllMessages}
                >
                  <IconButton display={{ base: "flex" }} icon={<ViewIcon />} />
                </UpdateGroupChatModal>
              </>
            )}
            <IconButton
              aria-label="Video Call"
              icon={<Video />}
              onClick={handleVideoCall}
            />
          </Text>

          <Box
            display="flex"
            flexDir="column"
            justifyContent="flex-end"
            p={3}
            bg="#E8E8E8"
            w="100%"
            h="100%"
            borderRadius="1g"
            overflowY="hidden"
          >
            {loading ? (
              <Spinner
                size="xl"
                w={20}
                h={20}
                alignSelf="center"
                margin="auto"
              />
            ) : (
              <>
                <div
                  className="messages"
                  style={{ height: "100%", overflowY: "auto" }}
                >
                  <ScrollableChat messages={messages} />
                </div>
              </>
            )}
            <FormControl
              onKeyDown={(e) =>
                e.key === "Enter" && newMessage && setNewMessage("")
              }
              isRequired
              mt={3}
            >
              <Input
                variant="filled"
                bg="#E0E0E0"
                placeholder="Enter a Message ..."
                onChange={(e) => setNewMessage(e.target.value)}
                value={newMessage}
              />
            </FormControl>
          </Box>
        </>
      ) : (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          h="100%"
        >
          <Text fontSize="3xl" pb={3} fontFamily="Work sans">
            Click on a user to start chatting
          </Text>
        </Box>
      )}

      {/* Incoming Call */}
      {incomingCall && (
        <IncomingCallModal
          caller={incomingCall.fromUserId}
          callerSocketId={incomingCall.callerSocketId}
          onAccept={(callerSocketId) => {
            setRemoteSocketId(callerSocketId);
            setShowCall(true);
            setIncomingCall(null);
          }}
          onReject={() => setIncomingCall(null)}
        />
      )}

      {/* Video Call Window */}
      {showCall && (
        <VideoCallWindow
          onClose={() => setShowCall(false)}
          chatId={SelectedChat?._id}
          remoteSocketId={remoteSocketId}
        />
      )}
    </>
  );
};

export default SingleChat;
