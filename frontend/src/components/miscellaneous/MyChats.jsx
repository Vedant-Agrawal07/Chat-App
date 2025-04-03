import React, { useContext, useEffect, useState } from "react";
import { ChatState } from "../../Context/ChatProvider.jsx";
import { Box, Button, Stack, Text, useToast } from "@chakra-ui/react";
import expressAsyncHandler from "express-async-handler";
import axios from "axios";
import { AddIcon } from "@chakra-ui/icons";
import ChatLoading from "../ChatLoading.jsx";
import GroupChatModal from "./GroupChatModal.jsx";

  const getSender = (loggedUser, users) => {
    return users[0]._id === loggedUser._id ? users[1].name : users[0].name;
  };

const MyChats = ({ fetchAgain }) => {
  const { user, SelectedChat, setSelectedChat, chats, setChats } = ChatState();
  const [loggedUser, setLoggedUser] = useState();
  const toast = useToast();

  const fetchChats = expressAsyncHandler(async (req, res) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.get("/api/chat", config);
      console.log(data);
      setChats(data);
    } catch (error) {
      toast({
        title: "Error Occured",
        description: "Failed to load chats",
        status: error,
        duration: 5000,
        isClosable: true,
      });
    }
  });

  useEffect(() => {
    setLoggedUser(JSON.parse(localStorage.getItem("userInfo")));
    fetchChats();
  }, [fetchAgain]);

 

  return (
    <>
      <Box
        display={{ base: SelectedChat ? "none" : "flex", md: "flex" }}
        flexDir={"column"}
        alignItems={"center"}
        p={3}
        bg={"white"}
        w={{ base: "100%", md: "31%" }}
        borderRadius={"1g"}
        borderWidth={"1px"}
      >
        <Box
          pb={3}
          px={3}
          fontSize={{ base: "28px", md: "30px" }}
          fontFamily={"Work sans"}
          display={"flex"}
          w={"100%"}
          justifyContent={"space-between"}
          alignItems={"center"}
        >
          My Chats
          <GroupChatModal>
            <Button
              display={"flex"}
              fontSize={{ base: "17px", md: "10px", lg: "17px" }}
              rightIcon={<AddIcon marginLeft={"3px"} />}
            >
              New Group Chat
            </Button>
          </GroupChatModal>
        </Box>
        <Box
          display={"flex"}
          flexDir={"column"}
          p={3}
          bg={"#F8F8F8"}
          w={"100%"}
          h={"100%"}
          borderRadius={"1g"}
          overflowY={"hidden"}
        >
          {chats ? (
            <Stack overflowY={"scroll"}>
              {chats.map((chat) => (
                <Box
                  key={chat._id}
                  onClick={() => setSelectedChat(chat)}
                  cursor={"pointer"}
                  bg={SelectedChat === chat ? "#38B2AC" : "#E8E8E8"}
                  color={SelectedChat === chat ? "white" : "black"}
                  px={3}
                  py={2}
                  borderRadius={"1g"}
                >
                  <Text>
                    {!chat.isGroupChat && chat.users && chat.users.length > 1
                      ? getSender(loggedUser, chat.users)
                      : `${chat.chatName}`}
                  </Text>
                </Box>
              ))}
            </Stack>
          ) : (
            <ChatLoading></ChatLoading>
          )}
        </Box>
      </Box>
    </>
  );
};

export { MyChats, getSender };

