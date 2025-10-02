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
  const [socketConnected, setSocketConnected] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);

  const toast = useToast();

  // --- Socket Setup ---
  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user);

    socket.on("connected", () => setSocketConnected(true));

    socket.on("receive-message", (message) => {
      if (
        !selectedChatCompare ||
        selectedChatCompare._id !== message.chat._id
      ) {
        if (!notification.some((notif) => notif._id === message._id)) {
          setNotification((prev) => [message, ...prev]);
          setFetchAgain(!fetchAgain);
        }
      } else {
        setMessages((prev) => {
          if (!prev.some((msg) => msg._id === message._id))
            return [...prev, message];
          return prev;
        });
      }
    });

    socket.on("incoming-call", ({ from }) => setIncomingCall(from));

    socket.on("updateRemovedUser", () => setFetchAgain(!fetchAgain));

    return () => {
      socket.off("receive-message");
      socket.off("incoming-call");
      socket.off("updateRemovedUser");
    };
  }, []);

  // --- Send message ---
  const sendMessage = async (event) => {
    if (event.key === "Enter" && newMessage) {
      setLoading(true);
      try {
        const config = {
          headers: {
            "Content-type": "application/json",
            authorization: `Bearer ${user.token}`,
          },
        };
        const { data } = await axios.post(
          `${ENDPOINT}/api/message`,
          { message: newMessage, chatId: SelectedChat._id },
          config
        );

        setNewMessage("");
        setMessages((prev) => [...prev, data]);
        socket.emit("send-message", data, SelectedChat._id);
        setLoading(false);
      } catch (error) {
        toast({
          title: "Error occurred",
          description: error.message,
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
        setLoading(false);
      }
    }
  };

  // --- Typing indicator ---
  const typingHandler = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    if (value === "") socket.emit("typingIndicate", false, SelectedChat._id);
    else socket.emit("typingIndicate", true, SelectedChat._id);
  };

  // --- Load messages ---
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
        position: "bottom",
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

  // --- Call Button Handler ---
  const handleVideoCall = () => {
    if (!SelectedChat) return;
    // Emit to server to notify others in the chat
    socket.emit("call-user", { chatId: SelectedChat._id, from: user.name });
    setShowCall(true);
  };

  return (
    <>
      {SelectedChat ? (
        <>
          {/* Chat Header */}
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

          {/* Messages */}
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
                {typingIndicator && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-start",
                      height: "40px",
                      width: "40px",
                    }}
                  >
                    <Lottie
                      style={{
                        borderRadius: "10px",
                        marginTop: "7px",
                        opacity: "70%",
                      }}
                      options={defaultOptions}
                      height={40}
                      width={40}
                    />
                  </div>
                )}
              </>
            )}
            <FormControl onKeyDown={sendMessage} isRequired mt={3}>
              <Input
                variant="filled"
                bg="#E0E0E0"
                placeholder="Enter a Message ..."
                onChange={typingHandler}
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

      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          caller={incomingCall}
          onAccept={() => {
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
        />
      )}
    </>
  );
};

export default SingleChat;
