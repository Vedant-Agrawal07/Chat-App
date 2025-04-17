import React, { useEffect, useState } from "react";
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

const ENDPOINT = "http://localhost:7000";

let socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const { user, SelectedChat, setSelectedChat, notification, setNotification } =
    ChatState();
  const getSingleChatUserName = () => {
    const userName = getSender(user, SelectedChat.users);
    return userName;
  };

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const toast = useToast();

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

        setNewMessage("");
        const { data } = await axios.post(
          "/api/message",
          {
            message: newMessage,
            chatId: SelectedChat._id,
          },
          config
        );
        console.log(data);
        setLoading(false);
        // setMessages([...messages, data]);
        setMessages((prevMessages) => [...prevMessages, data]);
        socket.emit("send-message", data, SelectedChat._id);
        return;
      } catch (error) {
        toast({
          title: "error occured",
          description: error.message,
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });

        setLoading(false);
        return;
      }
    }
  };

  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user);
    socket.on("connected", () => {
      console.log(`connection succesfull`);
      setSocketConnected(true);
    });
    socket.on("receive-message", (message) => {
      if (
        !selectedChatCompare ||
        selectedChatCompare._id !== message.chat._id
      ) {
        if (!notification.some((notif) => notif._id === message._id)) {
          setNotification((prevNotification) => [message, ...prevNotification]);
          setFetchAgain(!fetchAgain);
        }
      } else {
        setMessages((prevMessages) => {
          if (!prevMessages.some((msg) => msg._id === message._id)) {
            setFetchAgain(!fetchAgain);
            return [...prevMessages, message];
          }
          setFetchAgain(!fetchAgain);
          return prevMessages;
        });
      }
    });

    return () => {
      socket.off("receive-message");
    };
  }, []);

  useEffect(() => {
    socket.on("updateRemovedUser", () => {
      setFetchAgain(!fetchAgain);
    });
    return () => socket.off("updateRemovedUser");
  }, []);

  const typingHandler = (e) => {
    let value = e.target.value;
    setNewMessage(value);

    // typing indicator logic

    if (value === "") {
      socket.emit("typingIndicate", false, SelectedChat._id);
    }else{
       socket.emit("typingIndicate", true, SelectedChat._id);
    }
  };

  // useEffect(() => {
  //    if (!socket) {
  //      return;
  //    }
  //   socket.emit("typingIndicate", true, SelectedChat._id);
  //   return () => socket.off("typingIndicate");
  // }, []);

  useEffect(() => {
    if (!socket) {
      return;
    }
    socket.on("indicator", (indicator) => {
      setTypingIndicator(indicator);
    });
    return () => socket.off("indicator");
  }, []);

  const displayAllMessages = async () => {
    if (!SelectedChat) return;
    setLoading(true);
    const config = {
      headers: {
        authorization: `Bearer ${user.token}`,
      },
    };
    try {
      const { data } = await axios.get(
        `/api/message/${SelectedChat._id}`,
        config
      );
      console.log(data);
      setMessages(data);
      setLoading(false);

      socket.emit("joinChat", SelectedChat._id);

      return;
    } catch (error) {
      toast({
        title: "error occured",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });

      setLoading(false);
      return;
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
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  return (
    <>
      {SelectedChat ? (
        <>
          <Text
            fontSize={{ base: "27px", md: "30px" }}
            pb={3}
            px={2}
            w={"100%"}
            fontFamily={"Work sans"}
            display={"flex"}
            justifyContent={{ base: "space-between" }}
            alignItems={"center"}
          >
            <IconButton
              display={{ base: "flex", md: "none" }}
              icon={<ArrowBackIcon />}
              onClick={() => setSelectedChat("")}
            />

            {SelectedChat.chatName === "sender" ? (
              <>
                {getSingleChatUserName()}
                <ProfileModal user={user}></ProfileModal>
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
          </Text>
          <Box
            display={"flex"}
            flexDir={"column"}
            justifyContent={"flex-end"}
            p={3}
            bg={"#E8E8E8"}
            w={"100%"}
            h={"100%"}
            borderRadius={"1g"}
            overflowY={"hidden"}
          >
            {loading ? (
              <>
                <Spinner
                  size={"xl"}
                  w={20}
                  h={20}
                  alignSelf={"center"}
                  margin={"auto"}
                />
              </>
            ) : (
              <>
                <div
                  className="messages"
                  style={{ height: "100%", overflowY: "auto" }}
                >
                  <ScrollableChat messages={messages}></ScrollableChat>
                </div>
                {typingIndicator ? (
                  <>
                    <div
                      style={{ display: "flex", justifyContent: "flex-start" , height:"40px",  width:"40px"}}
                    >
                      <Lottie style={{borderRadius:"10px" , marginTop:"7px" , opacity:"70%"}} options={defaultOptions} height={40} width={40} />
                    </div>
                  </>
                ) : (
                  <></>
                )}
              </>
            )}
            <FormControl onKeyDown={sendMessage} isRequired mt={3}>
              <Input
                variant={"filled"}
                bg={"#E0E0E0"}
                placeholder="Enter a Message ..."
                onChange={(e) => typingHandler(e)}
                value={newMessage}
              ></Input>
            </FormControl>
          </Box>
        </>
      ) : (
        <Box
          display={"flex"}
          alignItems={"center"}
          justifyContent={"center"}
          h={"100%"}
        >
          <Text fontSize={"3xl"} pb={3} fontFamily={"Work sans"}>
            Click on a user to start chatting
          </Text>
        </Box>
      )}
    </>
  );
};

export default SingleChat;
