import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Navbar from './components/Navbar'
import Doctors from './pages/Doctors'
import Login from './pages/Login'
import Contact from './pages/Contact'
import About from './pages/About'
import MyProfile from './pages/MyProfile'
import MyAppointments from './pages/MyAppointments'
import Appointment from './pages/Appointment'
import Footer from './components/Footer'
const App = () => {
  return (
    <div className='mx-4 sm:mx-[8%]'> {/* sm: à breakpoint của Tailwind, nghĩa là CSS này chỉ áp dụng khi màn hình có kích thước từ 640px trở lên.  */}
      <Navbar />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/doctors' element={<Doctors />} /> 
        <Route path='/doctors/:speciality' element={<Doctors />} />
        {/* const { speciality } = useParams(); filter ra các bác sĩ trong khoa */} 
        <Route path='/login' element={<Login />} /> 
        <Route path='/about' element={<About />} />
        <Route path='/contact' element={<Contact />} /> 
        <Route path='/my-profile' element={<MyProfile />} />
        <Route path='/my-appointment' element={<MyAppointments />} />
        <Route path='/appointment/:docId' element={<Appointment />} />
      </Routes>
      <Footer />
    </div>
  )
}

export default App