import ForbiddenError from "../errors/forbidden";
const isSelfOrAdmin = (idField = "user_id") => {
  return (req, res, next) => {
    const userId = Number(req.user.user_id);
    const paramId = Number(req.params[idField]);
    const role = req.user.role;

    if (userId !== paramId && role !== "admin") {
      throw new ForbiddenError(
        "Bạn không có quyền truy cập vào tài nguyên này"
      );
    }

    next();
  };
};
export default isSelfOrAdmin;
