export const notFoundHandler = (req, res) => {
    res.status(404).json({
      status: "error",
      message: `Route ${req.originalUrl} không tồn tại`,
    });
  };
  