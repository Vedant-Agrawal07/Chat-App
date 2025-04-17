import React, { useEffect, useState } from "react";
import { ChatState } from "../../Context/ChatProvider";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Button,
  FormControl,
  Input,
  FormLabel,
  InputGroup,
  InputRightElement,
  Box,
  useToast,
} from "@chakra-ui/react";
import GroupMembers from "./GroupMembers";
import expressAsyncHandler from "express-async-handler";
import axios from "axios";
import UserListItem from "../userAvatar/UserListItem";
// import { application } from "express";

const UpdateGroupChatModal = ({
  fetchAgain,
  setFetchAgain,
  displayAllMessages,
  children,
}) => {
  const { user, SelectedChat, setSelectedChat, chats, setChats } = ChatState();
  const [newChatName, setNewChatName] = useState("");
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState(
    SelectedChat.users.filter((c) => c._id !== user._id)
  );
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  // console.log(SelectedChat.groupAdmin._id);

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
      return;
    }

    if (search) {
      const interval = setTimeout(() => {
        searchUsers();
      }, 1000);

      return () => clearTimeout(interval);
    }
  }, [search]);

  const updateMembers = expressAsyncHandler(async (member) => {
    if (user._id === SelectedChat.groupAdmin._id) {
      if (!selectedMembers.find((c) => c._id === member._id)) {
        const config = {
          headers: {
            "Content-type": "application/json",
            authorization: `Bearer ${user.token}`,
          },
        };

        try {
          const { data } = await axios.put(
            "/api/chat/groupadd",
            { chatId: SelectedChat._id, userId: member._id },
            config
          );
          console.log(data);
          // setChats([data, ...chats]);
          setFetchAgain(true);
          setSelectedMembers([member, ...selectedMembers]);
          toast({
            title: "User added",
            status: "success",
            duration: 5000,
            isClosable: true,
            position: "bottom-left",
          });
          return;
        } catch (error) {
          toast({
            title: "error occured",
            description: error.message,
            status: "error",
            duration: 5000,
            isClosable: true,
            position: "bottom-left",
          });
          return;
        }
      }

      toast({
        title: "User already added",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
      return;
    } else {
      toast({
        title: "You are not the admin",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
      return;
    }
  });

  const removeFromGroup = expressAsyncHandler(async (member) => {
    if (user._id === SelectedChat.groupAdmin._id) {
      const updatedList = selectedMembers.filter((c) => c._id !== member._id);

      const config = {
        headers: {
          "Content-type": "application/json",
          authorization: `Bearer ${user.token}`,
        },
      };
      try {
        const { data } = await axios.put(
          "/api/chat/groupremove",
          { chatId: SelectedChat._id, userId: member._id },
          config
        );
        console.log(data);
        setSelectedMembers(updatedList);
        socket.emit("removedUser" , member._id );
        setFetchAgain(!fetchAgain);
        displayAllMessages();
        toast({
          title: "User removed",
          status: "success",
          duration: 5000,
          isClosable: true,
          position: "bottom-left",
        });
      } catch (error) {
        toast({
          title: "error occured",
          status: "error",
          description: error.message,
          duration: 5000,
          isClosable: true,
          position: "bottom-left",
        });
      }
    } else {
      toast({
        title: "You are not the admin",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
      return;
    }
  });

  const groupLeave = expressAsyncHandler(async () => {
    const config = {
      headers: {
        "Content-type": "application/json",
        authorization: `Bearer ${user.token}`,
      },
    };
    try {
      const { data } = await axios.put(
        "/api/chat/groupremove",
        { chatId: SelectedChat._id, userId: user._id },
        config
      );
      console.log(data);
      setFetchAgain(!fetchAgain);
      toast({
        title: "Left The Group",
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
      setSelectedChat("");
      onClose();
      return;
    } catch (error) {
      toast({
        title: "error occured",
        status: "error",
        description: error.message,
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
      return;
    }
  });

  const updateGroupName = expressAsyncHandler(async () => {
    if (newChatName === "") {
      toast({
        title: "Please enter chat name",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
      return;
    }
    if (user._id === SelectedChat.groupAdmin._id) {
      const config = {
        headers: {
          "Content-type": "application/json",
          authorization: `Bearer ${user.token}`,
        },
      };
      try {
        const { data } = await axios.put(
          "/api/chat/rename",
          { chatId: SelectedChat._id, name: newChatName },
          config
        );
        console.log(data);
        setFetchAgain(true);
        toast({
          title: "Renamed the group",
          status: "success",
          duration: 5000,
          isClosable: true,
          position: "bottom-left",
        });
        setSelectedChat(data);
        setNewChatName("");
        return;
      } catch (error) {
        toast({
          title: "error occured",
          status: "error",
          description: error.message,
          duration: 5000,
          isClosable: true,
          position: "bottom-left",
        });
        return;
      }
    } else {
      toast({
        title: "You are not the admin",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
      return;
    }
  });

  return (
    <>
      <span onClick={onOpen}>{children}</span>
      <Modal isCentered isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader
            fontSize={"35px"}
            fontFamily={"Work sans"}
            display={"flex"}
            justifyContent={"center"}
            marginBottom={"-5px"}
          >
            {SelectedChat.chatName.toUpperCase()}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box display={"flex"}>
              {selectedMembers.map((user) => (
                <GroupMembers
                  key={user._id}
                  user={user}
                  handleFunction={() => removeFromGroup(user)}
                ></GroupMembers>
              ))}
            </Box>
            <FormControl display={"flex"} marginTop={"10px"}>
              <Input
                value={newChatName}
                onChange={(e) => setNewChatName(e.target.value)}
                placeholder="Chat Name"
              />

              <Button
                color={"white"}
                bg={"teal"}
                ml={1}
                variant={"solid"}
                onClick={updateGroupName}
              >
                Update
              </Button>
            </FormControl>
            <FormControl marginTop={"10px"}>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Add users to group"
              ></Input>
            </FormControl>
            {searchResult.length > 0 ? (
              searchResult.map((user) => (
                <UserListItem
                  key={user._id}
                  user={user}
                  handleFunction={() => updateMembers(user)}
                ></UserListItem>
              ))
            ) : (
              <></>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="red" mr={3} onClick={groupLeave}>
              Leave Group
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default UpdateGroupChatModal;
