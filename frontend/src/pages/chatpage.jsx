import React, { useEffect, useState } from "react";
import axios from "axios";
import { ChatState } from "../Context/ChatProvider.jsx";
import { Box } from "@chakra-ui/react";
import SideDrawer from "../components/miscellaneous/SideDrawer.jsx";
import { MyChats} from "../components/miscellaneous/MyChats.jsx";
import ChatBox from "../components/miscellaneous/ChatBox.jsx";

const chatpage = () => {
  const { user } = ChatState();
  const [fetchAgain, setFetchAgain] = useState(false);

  return (
    <>
      <div style={{ width: "100%" }}>
        {user && <SideDrawer></SideDrawer>}
        <Box
          display="flex"
          justifyContent="space-Between"
          width="100%"
          height="91.5vh"
          p="10px"
        >
          {user && <MyChats fetchAgain={fetchAgain}></MyChats>}
          {user && (
            <ChatBox
              fetchAgain={fetchAgain}
              setFetchAgain={setFetchAgain}
            ></ChatBox>
          )}
        </Box>
      </div>
    </>
  );
};

export default chatpage;
