import { createContext, useState, useEffect } from "react";
import { doctors } from "../assets/assets";
import { useNavigate } from "react-router-dom";
export const AppContext = createContext();

const AppContextProvider = (props) => {
  const [user, setUser] = useState(null);
  const currencySymbol = "$";
  const url1 = "http://localhost:5001";
  const navigate = useNavigate();

  // Restore user state from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const value = {
    doctors,
    currencySymbol,
    url1,
    navigate,
    user,
    login,
    logout,
  };

  return (
    <AppContext.Provider value={value}>
      {/* cung cấp hết tất cả các thuộc tính của value cho tất cả các component con */}
      {props.children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;
