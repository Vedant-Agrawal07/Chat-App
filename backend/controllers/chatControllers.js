import expressAsyncHandler from "express-async-handler";
import Chat from "../models/chatModel.js";
import User from "../models/userModel.js";

const accessChat = expressAsyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    console.log("userId param not sent with request");
    return res.sendStatus(400);
  }

  let isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "name profilePic email",
  });

  if (isChat.length > 0) {
    res.send(isChat[0]);
  } else {
    // create a new chat

    let chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    try {
      const createdChat = await Chat.create(chatData);

      const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        "users",
        "-password"
      );

      res.status(200).send(FullChat);
    } catch (error) {
      res.status(401);
      throw new Error(error.message);
    }
  }
});

const fetchChats = expressAsyncHandler(async (req, res) => {
  try {
    Chat.find({
      users: { $elemMatch: { $eq: req.user._id } },
    })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 })
      .then(async (results) => {
        results = await User.populate(results, {
          path: "latestMessage.sender",
          select: "name profilePic email",
        });

        res.status(200).send(results);
      });
  } catch (error) {
    res.status(400);
    throw new Error("failed to fetch chats");
  }
});

const createGroupChat = expressAsyncHandler(async (req, res) => {
  // console.log(req.body.name, req.body.users);
  if (!req.body.users || !req.body.name) {
    return res.status(400).send("please fill all the fields");
  }

  let users = JSON.parse(req.body.users);

  if (users.length < 2) {
    return res
      .status(400)
      .send("please select more than two users for a group chat");
  }

  users.push(req.user._id);

  try {
    let chatData = {
      chatName: req.body.name,
      isGroupChat: true,
      users: users,
      groupAdmin: req.user._id,
    };

    const createGroupChat = await Chat.create(chatData);
    const fullGroupChat = await Chat.find({ _id: createGroupChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.status(200).send(fullGroupChat);
  } catch (error) {
    res.status(400).send("failed to create group chat");
  }
});

const renameGroup = expressAsyncHandler(async (req, res) => {
  const { chatId, name } = req.body;
  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      chatName: name,
    },
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!updatedChat) {
    res.status(400);
    throw new Error("chat not found");
  } else {
    res.json(updatedChat);
  }
});

const addToGroup = expressAsyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;
  const added = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!added) {
    res.status(400).send("failed to add user");
  } else {
    res.status(200).json(added);
  }
});

const removeFromGroup = expressAsyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  let tempChat = await Chat.findOne({ _id: chatId });
  let isAdmin = userId === tempChat.groupAdmin.toString();

  let updatedUsers = tempChat.users.filter(
    (user) => userId !== user.toString()
  );

  let newAdmin = tempChat.groupAdmin;
  if (isAdmin && updatedUsers.length > 0) {
    newAdmin = updatedUsers[0];
  }

  const remove = await Chat.findByIdAndUpdate(
    chatId,
    {
      users:updatedUsers,
      groupAdmin: newAdmin,
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!remove) {
    res.status(400).send("failed to add user");
  } else {
    res.status(200).json(remove);
  }
});

export {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
};
