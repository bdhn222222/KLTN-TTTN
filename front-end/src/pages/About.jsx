import { assets } from "../assets/assets";

const About = () => {
  return (
    <div>
      <div>
        <p className="text-center text-2xl pt-10 text-gray-500">
          ABOUT <span className="text-gray-700 font-medium">US</span>
        </p>
      </div>

      <div className="my-10 flex flex-col md:flex-row gap-12">
        <img
          className="w-full md:max-w-[360px]"
          src={assets.about_image}
          alt=""
        />
        <div className="flex flex-col justify-center gap-6 md:w-2/4 text-sm text-gray-600">
          <p>
            Radiance Clinic is a leading U.S.-based healthcare facility
            dedicated to providing exceptional patient care through cutting-edge
            techniques and state-of-the-art medical technology. Our team of
            highly qualified doctors is committed to delivering personalized
            treatment, ensuring the highest standards of safety and
            effectiveness.
          </p>
          <p>
            At Radiance, we prioritize patient well-being and comfort, offering
            a compassionate approach that combines innovation with expertise for
            outstanding healthcare outcomes.
          </p>
          <b className="text-gray-800">Our Vision</b>
          <p>
            At Radiance Clinic, our vision is to redefine healthcare by setting
            a new standard for patient-centered care and clinical excellence. We
            aim to be a beacon of hope and healing, where advanced medical
            techniques and compassionate service come together to enhance the
            quality of life for every individual. We strive to continuously
            innovate, empowering our highly qualified doctors to deliver the
            best possible outcomes while building lasting trust and confidence
            with our patients.
          </p>
        </div>
      </div>

      <div className="text-xl my-4">
        <p>
          Why <span className="text-gray-700 font-semibold"> Choose Us</span>
        </p>
      </div>

      <div className="flex flex-col md:flex-row mb-20">
        <div className="border px-10 md:px-16 py-8 sm:py-16 flex flex-col gap-5 text-[15px] hover:bg-primary hover:text-white transition-all duration-300 text-gray-600 cursor-pointer">
          <b>Efficiency:</b>
          <p>
            Streamlined appointment scheduling that fits into your busy
            lifestyle.
          </p>
        </div>
        <div className="border px-10 md:px-16 py-8 sm:py-16 flex flex-col gap-5 text-[15px] hover:bg-primary hover:text-white transition-all duration-300 text-gray-600 cursor-pointer">
          <b>Convenience:</b>
          <p>
            Access to a network of trusted healthcare professionals in your
            area.
          </p>
        </div>
        <div className="border px-10 md:px-16 py-8 sm:py-16 flex flex-col gap-5 text-[15px] hover:bg-primary hover:text-white transition-all duration-300 text-gray-600 cursor-pointer">
          <b>Personalization:</b>
          <p>
            Tailored recommendations and reminders to help you stay on top of
            your health.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
