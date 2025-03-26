import { getAllUsers, getUserProfile } from "../services/userService.js";
import NotFoundError from "../errors/not_found.js";
import validateId from "../middleware/validateId.js";
import InternalServerError from "../errors/internalServerError.js";

export const getAllUsersController = async (req, res, next) => {
  try {
    const users = await getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    next(new InternalServerError(error.message)); 
  }
};



export const getUserProfileController = async (req, res, next) => {
  try {
    const { user_id } = req.params;
    validateId(user_id); // Kiểm tra ID hợp lệ
    const user = await getUserProfile(user_id);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};
