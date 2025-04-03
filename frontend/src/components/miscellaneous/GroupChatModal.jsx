import {
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  useToast,
  FormControl,
  FormLabel,
  Input,
  Box,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { ChatState } from "../../Context/ChatProvider.jsx";
import expressAsyncHandler from "express-async-handler";
import axios from "axios";
import MemberList from "./MemberList.jsx";
import GroupMembers from "./GroupMembers.jsx";
import UserListItem from "../userAvatar/UserListItem.jsx";

const GroupChatModal = ({ children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [groupChatName, setGroupChatName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { user, chats, setChats } = ChatState();

  const searchUsers = expressAsyncHandler(async () => {
    setLoading(true);
    try {
      const config = {
        headers: {
          authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.get(`/api/user?search=${search}`, config);
      console.log(data);
      setSearchResult(data);
      setLoading(false);
      return;
    } catch (error) {
      toast({
        title: "error searching users",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
      setLoading(false);
      return;
    }
  });

  useEffect(() => {
    if (search.trim().length === 0) {
      setSearchResult([]);
    }
    if (search) {
      const interval = setTimeout(() => {
        searchUsers();
      }, 1000);
      return () => clearTimeout(interval);
    }
  }, [search]);

  const selectedMembers = (user) => {
    if (!selectedUsers.find((c) => c._id === user._id)) {
      setSelectedUsers([...selectedUsers, user]);
       toast({
         title: "User added",
         status: "success",
         duration: 5000,
         isClosable: true,
         position: "bottom-left",
       });
      return;
    }

    toast({
      title: "User already added",
      status: "warning",
      duration: 5000,
      isClosable: true,
      position: "bottom-left",
    });
    return;
  };

  const createGroupChat = expressAsyncHandler(async () => {
    setLoading(true);
    const config = {
      headers: {
        authorization: `Bearer ${user.token}`,
      },
    };

    const selectedUsersId = selectedUsers.map((c) => c._id);

    try {
      if (!groupChatName) {
        toast({
          title: "Please add a group chat name",
          status: "warning",
          duration: 5000,
          isClosable: true,
          position: "bottom-left",
        });
        setLoading(false);
        return;
      } else if (selectedUsers.length < 2) {
        toast({
          title: "Please select more than 1 member",
          status: "warning",
          duration: 5000,
          isClosable: true,
          position: "bottom-left",
        });
        setLoading(false);
        return;
      }

      const { data } = await axios.post(
        "/api/chat/group",
        {
          name: groupChatName,
          users: JSON.stringify(selectedUsersId),
        },
        config
      );
      console.log(data);
      setLoading(false);
      toast({
        title: "Group Chat Created",
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
      setChats([data, ...chats]);
      onClose();
      return;
    } catch (error) {
      toast({
        title: "error creating group chat",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
      return;
    }
  });

   const removeMember = (user) => {
     const updatedList = selectedUsers.filter((c) => c._id !== user._id);
     setSelectedUsers(updatedList);
   };

  return (
    <>
      <span onClick={onOpen}>{children}</span>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader
            fontFamily={"Work sans"}
            fontSize={"35px"}
            display={"flex"}
            justifyContent={"center"}
          >
            Create Group Chat
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody display={"flex"} alignItems={"center"} flexDir={"column"}>
            <FormControl>
              <FormLabel>Group Name</FormLabel>
              <Input
                value={groupChatName}
                onChange={(e) => setGroupChatName(e.target.value)}
                placeholder="Enter Group Name"
              />
              <FormLabel marginTop={"7px"}>Members</FormLabel>
              <Input
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users"
              />
            </FormControl>

            {selectedUsers.length > 0 ? (
              <Box display={"flex"} flexDir={"row"}>
                {selectedUsers.map((user) => (
                  <GroupMembers
                    key={user._id}
                    user={user}
                    handleFunction = {()=> removeMember(user)}
                  ></GroupMembers>
                ))}
              </Box>
            ) : (
              <></>
            )}

            {searchResult.length > 0 ? (
              searchResult.map((user) => (
                <UserListItem
                  key={user._id}
                  user={user}
                  handleFunction={() => selectedMembers(user)}
                ></UserListItem>
              ))
            ) : (
              <></>
            )}
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={createGroupChat}>
              Create Chat
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default GroupChatModal;
