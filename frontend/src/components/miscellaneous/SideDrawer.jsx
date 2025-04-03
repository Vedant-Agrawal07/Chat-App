import React, { useState } from "react";
import {
  Box,
  Tooltip,
  Button,
  Menu,
  MenuButton,
  MenuList,
  Avatar,
  MenuItem,
  MenuDivider,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  useDisclosure,
  Input,
  Toast,
  useToast,
  Spinner,
} from "@chakra-ui/react";
import { Text } from "@chakra-ui/react";
import { BellIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { ChatState } from "../../Context/ChatProvider.jsx";
import ProfileModal from "./ProfileModal.jsx";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min.js";
import expressAsyncHandler from "express-async-handler";
import axios from "axios";
import ChatLoading from "../ChatLoading.jsx";
import UserListItem from "../userAvatar/UserListItem.jsx";
import { getSender } from "./MyChats.jsx";
// import { Effect, NotificationBadge } from "react-notification-badge";
import NotificationBadge from "react-notification-badge";
import { Effect } from "react-notification-badge";

const SideDrawer = () => {
  const [search, setSearch] = useState("");
  const [searchResult, setsearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState();

  const {
    user,
    setSelectedChat,
    chats,
    setChats,
    notification,
    setNotification,
  } = ChatState();
  const history = useHistory();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = React.useRef();

  const logoutHandler = () => {
    localStorage.removeItem("userInfo");
    history.push("/");
  };

  const toast = useToast();

  const handleSearch = expressAsyncHandler(async () => {
    if (!search) {
      toast({
        title: "please enter something in search",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "top-left",
      });
      return;
    }

    try {
      setLoading(true);
      const config = {
        headers: {
          authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.get(`/api/user?search=${search}`, config);
      console.log(data);
      setLoading(false);
      setsearchResult(data);
    } catch (error) {
      toast({
        title: "error occured!!",
        description: "failed to load the search results",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
      setLoading(false);
      return;
    }
  });

  const accessChat = expressAsyncHandler(async (userId) => {
    try {
      setLoadingChat(true);
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.post(
        "/api/chat",
        {
          userId: userId,
        },
        config
      );

      if (!chats.find((c) => c._id === data._id)) {
        setChats([data, ...chats]);
      }
      console.log(data);
      setLoadingChat(false);
      setSelectedChat(data);
      onClose();
    } catch (error) {
      toast({
        title: "error fetching the chat",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  });

  return (
    <>
      <Box
        display="flex"
        justifyContent={"space-between"}
        alignItems={"center"}
        bg={"#E2E8F0"}
        width={"100%"}
        p={"5px 10px 5px 10px"}
        borderWidth={"5px"}
      >
        <Tooltip label="Search Users to Chat" hasArrow placement="bottom-end">
          <Button
            colorScheme="teal"
            variant={"ghost"}
            ref={btnRef}
            onClick={onOpen}
          >
            <i className="fa-solid fa-magnifying-glass"></i>
            <Text display={{ base: "none", md: "flex" }} px={"4"}>
              Search User
            </Text>
          </Button>
        </Tooltip>

        <Text fontSize={"2xl"} fontFamily={"work sans"}>
          ECHO ECHO
        </Text>
        <div>
          <Menu>
            <MenuButton p={1}>
              <NotificationBadge
                count={notification.length}
                effect={Effect.SCALE}
              />
              <BellIcon fontSize={"2xl"} margin={1} />
            </MenuButton>
            <MenuList>
              {notification.length < 1 && `No new messages`}
              {notification.length > 0 &&
                notification.map((notify) => (
                  <MenuItem
                    key={notify._id}
                    onClick={() => {
                      setSelectedChat(notify.chat);
                      setNotification(notification.filter((n) => n !== notify));
                    }}
                  >
                    {notify.chat.isGroupChat
                      ? `New message in ${notify.chat.chatName}`
                      : `New message from ${getSender(
                          user,
                          notify.chat.users
                        )}`}
                  </MenuItem>
                ))}
            </MenuList>
          </Menu>
          <Menu>
            <MenuButton as={Button} rightIcon={<ChevronDownIcon />} p={1}>
              <Avatar
                size={"sm"}
                cursor={"pointer"}
                name={user.name}
                src={user.profilePic}
              ></Avatar>
            </MenuButton>
            <MenuList>
              <ProfileModal user={user}>
                <MenuItem>My Profile</MenuItem>
              </ProfileModal>
              <MenuDivider />
              <MenuItem onClick={logoutHandler}>LogOut</MenuItem>
            </MenuList>
          </Menu>
        </div>
      </Box>

      <Drawer
        isOpen={isOpen}
        placement="left"
        onClose={onClose}
        finalFocusRef={btnRef}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Search Users</DrawerHeader>

          <DrawerBody>
            <Box display={"flex"}>
              <Input
                placeholder="Search By Name or Email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button
                onClick={handleSearch}
                marginLeft={"5px"}
                variant={"outline"}
              >
                GO
              </Button>
            </Box>

            {loading ? (
              <ChatLoading></ChatLoading>
            ) : (
              searchResult?.map((user) => (
                <UserListItem
                  key={user._id}
                  user={user}
                  handleFunction={() => accessChat(user._id)}
                ></UserListItem>
              ))
            )}
            {loadingChat && <Spinner ml={"auto"} display={"flex"} />}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default SideDrawer;
