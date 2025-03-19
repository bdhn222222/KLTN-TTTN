import ForbiddenError from "../errors/forbidden.js";

const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError("Bạn không có quyền thực hiện hành động này");
    }
    next();
  };
};

export default authorize;
