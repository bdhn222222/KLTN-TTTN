// NavbarPatient.jsx
import { useContext } from "react";
import { AppContext } from "../../context/AppContext";

const NavbarPatient = () => {
  const { user, logout } = useContext(AppContext);

  return (
    <nav className="flex justify-between px-4 py-2 shadow">
      <span>Xin chào, {user?.username || "Khách"}</span>
      <button onClick={logout} className="text-red-600 font-semibold">
        Đăng xuất
      </button>
    </nav>
  );
};

export default NavbarPatient;