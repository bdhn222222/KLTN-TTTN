import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import Home from "./pages/Patient/Home";
import NavbarPatient from "./components/Patient/NavbarPatient";
import Doctors from "./pages/Patient/Doctors";
import Login from "./pages/Login";
import Contact from "./pages/Patient/Contact";
import About from "./pages/Patient/About";
import MyProfile from "./pages/Patient/MyProfile";
import MyAppointments from "./pages/Patient/MyAppointments";
import Register from "./pages/Patient/Register";
import Appointment from "./pages/Patient/Appointment";
import FooterPatient from "./components/Patient/FooterPatient";
import AppContextProvider from "./context/AppContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "antd/dist/reset.css";
import DashboardDoctor from "./pages/Doctor/DashboardDoctor";
import AllAppointmentPatient from "./pages/Doctor/AllAppointmentPatient";
import ScheduleDoctor from "./pages/Doctor/ScheduleDoctor";
import NavbarDoctor from "./components/Doctor/NavbarDoctor";
import AppointmentWTCDoctor from "./pages/Doctor/AppointmentWTCDoctor";
import AppointmentAccDoctor from "./pages/Doctor/AppointmentAccDoctor";
import CreateMedicalRecordPage from "./pages/Doctor/CreateMedicalRecordPage";
import AppointmentComDoctor from "./pages/Doctor/AppointmentComDoctor";
import AppointmentCanDoctor from "./pages/Doctor/AppointmentCanDoctor";
import AppointmentPaymentPage from "./pages/Doctor/AppointmentPaymentPage";
import PatientDoctor from "./pages/Doctor/PatientDoctor";
import ProfileDoctor from "./pages/Doctor/ProfileDoctor";
import PrescriptionPrepare from "./pages/Pharmacists/PrescriptionPrepare";
import BookAppointment from "./pages/Patient/bookAppointment";

// Layout cho Patient Portal
const PatientLayout = () => {
  return (
    <div className="mx-4 sm:mx-[8%]">
      <NavbarPatient />
      <Outlet />
      <FooterPatient />
    </div>
  );
};

// Layout cho Doctor Portal
const DoctorLayout = () => {
  return (
    <div>
      <NavbarDoctor />
      <Outlet />
    </div>
  );
};

const PharmacistLayout = () => {
  return (
    <div>
      <NavbarPharmacist />
      <Outlet />
    </div>
  );
};

const App = () => {
  return (
    <AppContextProvider>
      <Routes>
        {/* Patient Routes */}
        <Route path="/" element={<PatientLayout />}>
          <Route index element={<Home />} />
          <Route path="doctors" element={<Doctors />} />

          <Route path="doctors/:speciality" element={<Doctors />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="my-profile" element={<MyProfile />} />
          <Route path="my-appointments" element={<MyAppointments />} />
          <Route path="appointment/:docId" element={<Appointment />} />
          <Route path="book-appointment" element={<BookAppointment />} />
        </Route>

        {/* Doctor Routes */}
        <Route path="/doctor" element={<DoctorLayout />}>
          <Route path="dashboard" element={<DashboardDoctor />} />
          <Route path="appointments">
            <Route
              path="waiting-to-confirm"
              element={<AppointmentWTCDoctor />}
            />
            <Route path="accepted" element={<AppointmentAccDoctor />} />
            <Route path="completed" element={<AppointmentComDoctor />} />
            <Route path="cancelled" element={<AppointmentCanDoctor />} />
            <Route
              path=":appointment_id/payment"
              element={<AppointmentPaymentPage />}
            />
          </Route>
          <Route
            path="medical-records/create/:appointment_id"
            element={<CreateMedicalRecordPage />}
          />
          <Route path="patients" element={<PatientDoctor />} />
          <Route
            path="patients/:patient_id"
            element={<AllAppointmentPatient />}
          />
          <Route path="schedule" element={<ScheduleDoctor />} />
          <Route path="profile" element={<ProfileDoctor />} />
        </Route>

        {/* Pharmacist Routes */}
        <Route path="/pharmacists" element={<PharmacistLayout />}>
          {/* Default route for pharmacists - redirects to pending_prepare */}
          <Route
            index
            element={
              <Navigate
                to="/pharmacists/prescription/pending_prepare"
                replace
              />
            }
          />
          <Route path="prescription">
            <Route path="pending_prepare" element={<PrescriptionPrepare />} />
            {/* Uncomment these routes when the components are ready */}
            {/* <Route path="waiting_payment" element={<PrescriptionWaitingPayment />} /> */}
            {/* <Route path="completed" element={<PrescriptionCompleted />} /> */}
            {/* <Route path="cancelled" element={<PrescriptionCancelled />} /> */}
            {/* You can use the line below temporarily until you create the other components */}
            <Route path="*" element={<PrescriptionPrepare />} />
          </Route>
          <Route
            path="*"
            element={
              <Navigate
                to="/pharmacists/prescription/pending_prepare"
                replace
              />
            }
          />
        </Route>

        {/* Shared Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Redirect unknown routes to login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
      <ToastContainer />
    </AppContextProvider>
  );
};
export default App;
