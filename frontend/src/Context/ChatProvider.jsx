import { createContext, useContext, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

const ChatContext = createContext();

const ChatProvider = ({ children }) => {
  const [user, setUser] = useState();
  const [SelectedChat, setSelectedChat] = useState();
  const [chats, setChats] = useState([]);
  const [notification , setNotification] = useState([]);
  const history = useHistory();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    if (!userInfo) {
      history.push("/");
    }

    setUser(userInfo);
  }, [history]);

  return (
    <>
      <ChatContext.Provider
        value={{
          user,
          setUser,
          SelectedChat,
          setSelectedChat,
          chats,
          setChats,
          notification,
          setNotification,
        }}
      >
        {children}
      </ChatContext.Provider>
    </>
  );
};

export const ChatState = () => {
  return useContext(ChatContext);
};

export default ChatProvider;
