router.patch(
  "/payments/:payment_id/status",
  authenticateUser,
  authorize(["admin"]),
  updatePaymentStatusController
);
