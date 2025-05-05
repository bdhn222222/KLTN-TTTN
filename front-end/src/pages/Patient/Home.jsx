import SpecialityMenu from "../../components/Patient/SpecialityMenuPatient";
import Header from "../../components/Patient/HeaderPatient";
import TopDoctors from "../../components/Patient/TopDoctorsPatient";
import Banner from "../../components/Patient/BannerPatient";
import Footer from "../../components/Patient/FooterPatient";
const Home = () => {
  const token = localStorage.getItem("token");

  return (
    <div>
      <Header />
    </div>
  );
};

export default Home;
