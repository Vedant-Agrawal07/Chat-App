import expressAsyncHandler from "express-async-handler";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
// import Chat from "../models/chatModel";
import Chat from "../models/chatModel.js";

const sendMessage = expressAsyncHandler(async (req, res) => {
  let { message, chatId } = req.body;
  if (!message || !chatId) {
    console.log("imvalid data passed into request");
    return res.sendStatus(400);
  }

  let newMessage = {
    sender: req.user._id,
    content: message,
    chat: chatId,
  };

  try {
    let message = await Message.create(newMessage);
    let fullMessage = await Message.findOne({ _id: message._id })
      .populate("sender", "name profilePic")
      .populate("chat");

    fullMessage = await User.populate(fullMessage, {
      path: "chat.users",
      select: "name profilePic",
    });
    console.log(fullMessage);
    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: fullMessage,
    });
    res.json(fullMessage);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const allMessages = expressAsyncHandler(async (req, res) => {
  const { chatId } = req.params;
  console.log(chatId);
  try {
    const messages = await Message.find({ chat: chatId }).populate(
      "sender",
      "name email profilePic"
    ).populate("chat");
    res.json(messages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

export { sendMessage, allMessages };
