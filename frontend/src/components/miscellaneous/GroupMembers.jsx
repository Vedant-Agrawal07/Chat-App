import { Box, CloseButton, Text } from "@chakra-ui/react";
import React from "react";

const GroupMembers = ({ user, handleFunction }) => {
 
  return (
    <>
      <Box
        bg="purple.500"
        color="white"
        display="flex"
        alignItems="center"
        justifyContent={"center"}
        borderRadius="md"
        p={2}
        m={1}
        cursor={"pointer"}
      >
        <Text mr={2}>{user.name}</Text>
        <CloseButton size="sm" onClick={handleFunction} />
      </Box>
    </>
  );
};

export default GroupMembers;
