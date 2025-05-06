import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import Home from "./pages/Patient/Home";
import NavbarPatient from "./components/Patient/NavbarPatient";
import NavbarPhar from "./components/Pharmacist/NavbarPhar";
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
import PatientDetail from "./pages/Doctor/PatientDetail";
import ProfileDoctor from "./pages/Doctor/ProfileDoctor";
import PrescriptionPrepare from "./pages/Pharmacists/PrescriptionPrepare";
import PrescriptionDetail from "./pages/Pharmacists/PrescriptionDetail";
import BookAppointment from "./pages/Patient/bookAppointment";
import AppointmentDetail from "./pages/Patient/AppointmentDetail";
import PaymentAppointment from "./pages/Patient/PaymentAppointment";
import AdminLayout from "./components/Admin/AdminLayout";
import AppointmentWTCAdmin from "./pages/Admin/AppointmentWTCAdmin";
import AppointmentAccAdmin from "./pages/Admin/AppointmentAccAdmin";
import AppointmentComAdmin from "./pages/Admin/AppointmentComAdmin";
import AppointmentCanAdmin from "./pages/Admin/AppointmentCanAdmin";
import AppointmentNotComingAdmin from "./pages/Admin/AppointmentNotComingAdmin";
import PaymentUnpaidAdmin from "./pages/Admin/PaymentUnpaidAdmin";
import PaymentPaidAdmin from "./pages/Admin/PaymentPaidAdmin";
import SpecializationManageAdmin from "./pages/Admin/SpecializationManageAdmin";
import DoctorManageAdmin from "./pages/Admin/DoctorManageAdmin";
import DoctorDetailAdmin from "./pages/Admin/DoctorDetailAdmin";
import PrescriptionCompleted from "./pages/Pharmacists/PrescriptionCompleted";
import PrescriptionDetailToPrepare from "./pages/Pharmacists/PrescriptionDetailToPrepare";

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
      <NavbarPhar />
      <Outlet />
    </div>
  );
};

const App = () => {
  return (
    <AppContextProvider>
      <Routes>
        <Route index element={<Login />} />
        {/* Patient Routes */}
        <Route path="/" element={<PatientLayout />}>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="home" element={<Home />} />
          <Route path="doctors" element={<Doctors />} />
          <Route path="doctors/:speciality" element={<Doctors />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="my-profile" element={<MyProfile />} />
          <Route path="my-appointments" element={<MyAppointments />} />
          <Route path="appointment/:docId" element={<Appointment />} />
          <Route path="book-appointment" element={<BookAppointment />} />
        </Route>

        {/* Specific Patient Route */}
        <Route
          path="/patient/appointment/:id"
          element={<AppointmentDetail />}
        />
        <Route path="/patient/payment/:id" element={<PaymentAppointment />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route
            index
            element={
              <Navigate to="/admin/appointments/waiting-to-confirm" replace />
            }
          />
          <Route path="appointments">
            <Route
              index
              element={
                <Navigate to="/admin/appointments/waiting-to-confirm" replace />
              }
            />
            <Route
              path="waiting-to-confirm"
              element={<AppointmentWTCAdmin />}
            />
            <Route path="accepted" element={<AppointmentAccAdmin />} />
            <Route path="completed" element={<AppointmentComAdmin />} />
            <Route path="cancelled" element={<AppointmentCanAdmin />} />
            <Route
              path="patient-not-coming"
              element={<AppointmentNotComingAdmin />}
            />
          </Route>
          <Route path="payments">
            <Route path="unpaid" element={<PaymentUnpaidAdmin />} />
            <Route path="paid" element={<PaymentPaidAdmin />} />
          </Route>
          <Route path="management">
            <Route path="departments" element={<SpecializationManageAdmin />} />
            <Route path="doctors">
              <Route index element={<DoctorManageAdmin />} />
              <Route path=":doctorId" element={<DoctorDetailAdmin />} />
            </Route>
          </Route>
        </Route>

        {/* Doctor Routes */}
        <Route path="/doctor" element={<DoctorLayout />}>
          <Route index element={<Navigate to="/doctor/dashboard" replace />} />
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
          <Route
            path="patients/:family_member_id/detail"
            element={<PatientDetail />}
          />
          <Route
            path="family-members/:family_member_id/appointments"
            element={<AllAppointmentPatient />}
          />
          <Route path="schedule" element={<ScheduleDoctor />} />
          <Route
            path="family-members/:family_member_id"
            element={<PatientDetail />}
          />
          <Route path="profile" element={<ProfileDoctor />} />
        </Route>

        {/* Pharmacist Routes */}
        <Route path="/pharmacist" element={<PharmacistLayout />}>
          <Route
            index
            element={
              <Navigate to="/pharmacist/prescriptions/pending" replace />
            }
          />
          <Route path="prescriptions">
            <Route path="pending" element={<PrescriptionPrepare />} />
            <Route path="completed" element={<PrescriptionCompleted />} />
            <Route
              path=":prescriptionId/detail"
              element={<PrescriptionDetail />}
            />
            <Route
              path=":prescriptionId/detail-to-prepare"
              element={<PrescriptionDetailToPrepare />}
            />
            <Route path="*" element={<PrescriptionPrepare />} />
          </Route>
          <Route
            path="*"
            element={
              <Navigate to="/pharmacist/prescriptions/pending" replace />
            }
          />
        </Route>

        {/* Also update the old pharmacists route for backward compatibility */}
        <Route path="/pharmacists" element={<PharmacistLayout />}>
          <Route
            index
            element={
              <Navigate to="/pharmacist/prescriptions/pending" replace />
            }
          />
          <Route path="prescription">
            <Route path="pending_prepare" element={<PrescriptionPrepare />} />
            <Route path="*" element={<PrescriptionPrepare />} />
          </Route>
          <Route
            path="*"
            element={
              <Navigate to="/pharmacist/prescriptions/pending" replace />
            }
          />
        </Route>

        {/* Shared Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Redirect unknown routes to login */}
        <Route path="/" element={<Navigate to="/login" />} />

        <Route path="/patient" element={<PatientLayout />}>
          <Route path="my-appointments" element={<MyAppointments />} />
          <Route path="appointment/:id" element={<AppointmentDetail />} />
          <Route
            path="appointments/:id/payment"
            element={<PaymentAppointment />}
          />
          <Route path="book-appointment" element={<BookAppointment />} />
        </Route>
      </Routes>
      <ToastContainer />
    </AppContextProvider>
  );
};

export default App;
