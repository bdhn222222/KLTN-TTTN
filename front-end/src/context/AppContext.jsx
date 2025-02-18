import { createContext } from "react";
import { doctors } from "../assets/assets";
export const AppContext = createContext();

const AppContextProvider = (props) => {
  const currencySymbol = "$";
  const value = {
    doctors,
    currencySymbol,
  };
  return (
    <AppContext.Provider value={value}>  
    {/* cung cấp hết tất cả các thuộc tính của value cho tất cả các component con */}
      {props.children}
    </AppContext.Provider>  
  );
};

export default AppContextProvider;