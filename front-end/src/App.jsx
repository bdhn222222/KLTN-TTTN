import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Patient/Home";
import NavbarPatient from "./components/Patient/NavbarPatient";
import Doctors from "./pages/Patient/Doctors";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Contact from "./pages/Patient/Contact";
import About from "./pages/Patient/About";
import MyProfile from "./pages/Patient/MyProfile";
import MyAppointments from "./pages/Patient/MyAppointments";
import Appointment from "./pages/Patient/Appointment";
import FooterPatient from "./components/Patient/FooterPatient";
import AppContextProvider from "./context/AppContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "antd/dist/reset.css";
import DashboardDoctor from './pages/Doctor/DashboardDoctor';
import NavbarDoctor from "./components/Doctor/NavbarDoctor";

// Layout cho Patient Portal
const PatientLayout = ({ children }) => {
  return (
    <div className="mx-4 sm:mx-[8%]">
      <NavbarPatient />
      {children}
      <FooterPatient />
    </div>
  );
};

// Layout cho Doctor Portal
const DoctorLayout = ({ children }) => {
  return (
    <div>
      {children}
    </div>
  );
};

const App = () => {
  return (
    <AppContextProvider>
      <Routes>
        {/* Patient Routes */}
        <Route path="/" element={
          <PatientLayout>
            <Routes>
              <Route index element={<Home />} />
              <Route path="doctors" element={<Doctors />} />
              <Route path="doctors/:speciality" element={<Doctors />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
              <Route path="my-profile" element={<MyProfile />} />
              <Route path="my-appointments" element={<MyAppointments />} />
              <Route path="appointment/:docId" element={<Appointment />} />
            </Routes>
          </PatientLayout>
        } />

        {/* Doctor Routes */}
        <Route path="/doctor/*" element={
          <DoctorLayout>
            <Routes>
              <Route path="dashboard" element={<DashboardDoctor />} />
              {/* Add more doctor routes here */}
            </Routes>
          </DoctorLayout>
        } />

        {/* Shared Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </AppContextProvider>
  );
};

export default App;
