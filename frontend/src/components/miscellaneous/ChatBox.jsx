import { Box, Input } from "@chakra-ui/react";
import React from "react";
import { ChatState } from "../../Context/ChatProvider";
import SingleChat from "../SingleChat.jsx";

const ChatBox = ({ fetchAgain, setFetchAgain }) => {
  const { user, SelectedChat, setSelectedChat, setChats, chats } = ChatState();

  return (
    <>
      <Box
        display={{ base: SelectedChat ? "flex" : "none", md: "flex" }}
        alignItems={"center"}
        flexDir={"column"}
        p={3}
        bg={"white"}
        w={{ base: "100%", md: "68%" }}
        borderRadius={"1g"}
        borderWidth={"1px"}
      >
       
        {/* header containing chatname and eye button for editing group chat data  */}
        <SingleChat
          fetchAgain={fetchAgain}
          setFetchAgain={setFetchAgain}
        ></SingleChat>
        {/* message display screen */}
        
      </Box>
    </>
  );
};

export default ChatBox;
