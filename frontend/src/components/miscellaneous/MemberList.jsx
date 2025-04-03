import { Box, Text } from "@chakra-ui/react";
import React from "react";

const MemberList = ({user , handleFunction}) => {
  return (
    <>
      <Box
        onClick={handleFunction}
        cursor={"pointer"}
        bg={"#E8E8E8"}
        _hover={{
          background: "#38B2AC",
          color: "white",
        }}
        w={"100%"}
        display={"flex"}
        alignItems={"center"}
        color={"black"}
        px={3}
        py={2}
        mb={2}
        borderRadius={"1g"}
      >
        <Box>
          <Text>{user.name}</Text>
        </Box>
      </Box>
    </>
  );
};

export default MemberList;
