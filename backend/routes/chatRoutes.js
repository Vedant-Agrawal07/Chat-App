import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  accessChat,
  createGroupChat,
  fetchChats,
  renameGroup,
  addToGroup,
  removeFromGroup,
} from "../controllers/chatControllers.js";

const router = express.Router();

router.route("/").post(protect, accessChat);
router.route("/").get(protect, fetchChats);
router.route("/group").post(protect, createGroupChat);
router.route("/rename").put(protect, renameGroup);
router.route('/groupadd').put(protect , addToGroup);
router.route("/groupremove").put(protect, removeFromGroup);

export default router;
