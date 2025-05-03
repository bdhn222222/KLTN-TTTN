router.post(
  "/patient/doctor-by-symptoms",
  authenticateUser,
  getDoctorBySymptomsController
);
