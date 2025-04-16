import { createContext } from "react";
import { doctors } from "../assets/assets";
import { useNavigate } from "react-router-dom";
export const AppContext = createContext();

const AppContextProvider = (props) => {
  const currencySymbol = "$";
  const url1 = "http://localhost:5001";
  const navigate = useNavigate();
  const value = {
    doctors,
    currencySymbol,
    url1,
    navigate,
  };
  return (
    <AppContext.Provider value={value}>
      {/* cung cấp hết tất cả các thuộc tính của value cho tất cả các component con */}
      {props.children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;
