import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { assets } from "../../assets/assets";

function Navbar() {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [token, setToken] = useState(true);

  const logout = () => {
    setToken(false);
    localStorage.removeItem("token");
  };

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-400 px-6 md:px-10">
      {/* Logo */}
      <img className="w-28 cursor-pointer" src={assets.logo} alt="Logo" />

      {/* Desktop Navigation */}
      <ul className="hidden md:flex items-center gap-6 font-medium">
        <NavLink to="/" className="relative group flex flex-col items-center">
          <li className="py-1 hover:text-primary transition duration-200">
            Home
          </li>
          <hr className="w-full h-0.5 bg-primary opacity-0 group-hover:opacity-100 transition-all duration-300" />
        </NavLink>
        <NavLink
          to="/doctors"
          className="relative group flex flex-col items-center"
        >
          <li className="py-1 hover:text-primary transition duration-200">
            All Doctors
          </li>
          <hr className="w-full h-0.5 bg-primary opacity-0 group-hover:opacity-100 transition-all duration-300" />
        </NavLink>
        <NavLink
          to="/about"
          className="relative group flex flex-col items-center"
        >
          <li className="py-1 hover:text-primary transition duration-200">
            About
          </li>
          <hr className="w-full h-0.5 bg-primary opacity-0 group-hover:opacity-100 transition-all duration-300" />
        </NavLink>
        <NavLink
          to="/contact"
          className="relative group flex flex-col items-center"
        >
          <li className="py-1 hover:text-primary transition duration-200">
            Contact
          </li>
          <hr className="w-full h-0.5 bg-primary opacity-0 group-hover:opacity-100 transition-all duration-300" />
        </NavLink>
      </ul>

      {/* Profile & Authentication */}
      <div className="flex items-center gap-4">
        {token ? (
          <div className="relative group cursor-pointer">
            <div className="flex items-center gap-2">
              <img
                className="w-8 rounded-full"
                src={assets.profile_pic}
                alt="Profile"
              />
              <img
                className="w-2.5"
                src={assets.dropdown_icon}
                alt="Dropdown"
              />
            </div>
            <div className="absolute right-0 mt-3 w-48 bg-white shadow-lg rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
              <div className="p-4 flex flex-col gap-3 text-gray-700">
                <p
                  onClick={() => navigate("/my-profile")}
                  className="hover:text-black cursor-pointer"
                >
                  My Profile
                </p>
                <p
                  onClick={() => navigate("/my-appointments")}
                  className="hover:text-black cursor-pointer"
                >
                  My Appointments
                </p>
                <p onClick={logout} className="hover:text-black cursor-pointer">
                  Logout
                </p>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="!bg-primary !text-white px-6 py-2 rounded-full font-light hidden md:block hover:!bg-blue-800 hover:!text-white border border-blue-800 transition duration-300"
          >
            Create Account
          </button>
        )}

        {/* Mobile Menu Button */}
        <img
          onClick={() => setShowMenu(true)}
          className="w-6 cursor-pointer md:hidden"
          src={assets.menu_icon}
          alt="Menu"
        />
      </div>

      {/* Mobile Sidebar Menu */}
      {showMenu && (
        <div className="fixed inset-0 bg-black/50 z-50">
          <div className="fixed top-0 right-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 md:hidden">
            {/* Close Button */}
            <div className="flex justify-between items-center p-4 border-b border-gray-300">
              <img className="w-24" src={assets.logo} alt="Logo" />
              <img
                onClick={() => setShowMenu(false)}
                className="w-6 cursor-pointer"
                src={assets.cross_icon}
                alt="Close"
              />
            </div>

            {/* Mobile Menu Items */}
            <ul className="p-4 text-gray-700">
              <NavLink to="/" onClick={() => setShowMenu(false)}>
                <li className="py-3 border-b border-gray-200 hover:text-primary transition duration-200">
                  Home
                </li>
              </NavLink>
              <NavLink to="/doctors" onClick={() => setShowMenu(false)}>
                <li className="py-3 border-b border-gray-200 hover:text-primary transition duration-200">
                  All Doctors
                </li>
              </NavLink>
              <NavLink to="/about" onClick={() => setShowMenu(false)}>
                <li className="py-3 border-b border-gray-200 hover:text-primary transition duration-200">
                  About
                </li>
              </NavLink>
              <NavLink to="/contact" onClick={() => setShowMenu(false)}>
                <li className="py-3 border-b border-gray-200 hover:text-primary transition duration-200">
                  Contact
                </li>
              </NavLink>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default Navbar;
