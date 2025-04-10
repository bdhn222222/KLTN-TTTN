import { assets } from "../../assets/assets";

const Footer = () => {
  return (
    <div className="md:mx-10">
      <div className="flex flex-col sm:grid grid-cols-[3fr_1fr_1fr] gap-14 my-10 mt-40 text-sm">
        {/* Lưới 1 */}
        <div>
          <img className="mb-5 w-32" src={assets.logo} alt="" />
          <p className="w-full md:w-2/3 text-gray-600 leading-6">
            Radiance Clinic is a leading U.S.-based healthcare facility
            dedicated to providing exceptional patient care through cutting-edge
            techniques and state-of-the-art medical technology.
          </p>
        </div>
        {/* Lưới 2 */}
        <div>
          <p className="text-xl font-medium mb-5">COMPANY</p>
          <ul className="flex flex-col gap-2 text-gray-600">
            <li>Home</li>
            <li>About Us</li>
            <li>Contact Us</li>
            <li>Privacy Policy</li>
          </ul>
        </div>
        {/* Lưới 3 */}
        <div>
          <p className="text-xl font-medium mb-5">GET IN TOUCH</p>
          <ul className="flex flex-col gap-2 text-gray-600">
            <li>+84 909 090 909</li>
            <li>nguyen25102003n@gmail.com</li>
          </ul>
        </div>
      </div>
      
      <div>
        <hr />
        <p className="py-5 text-sm text-center ">
          Copyright © 2024 Radiance - All Right Reserved.
        </p>
      </div>
    </div>
  );
};

export default Footer;