import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { FaChevronLeft } from 'react-icons/fa';
import backgroundImage from '../assets/wave2.jpg';
import theMenuImage from '../assets/foodicon.webp';
import cafeteriaImage from '../assets/coffeeicon.png';
import campusImage from '../assets/campusicon.webp';
import securityImage from '../assets/securityicon.webp';
import kgisl_logo from '../assets/kgisl_logo_bg.png';
import '../styles/DomainLanding.css';
import { Tooltip } from 'react-tooltip';
 
function DomainLanding() {
  const location = useLocation();
  const navigate = useNavigate();
  const formData = location.state?.formData;
const fromEmployeeForm = location.state?.fromEmployeeForm || false;
  const welcomeMessage = formData
    ? `Welcome, ${formData.firstName}!`
    : 'Welcome!';
 
  const handleBackClick = () => {
    navigate('/');
  };
 
  return (
    <div className="domain-landing-main-wrapper">
      <div className="domain-landing-background-image-container">
        <img src={backgroundImage} alt="Background Wave Pattern" className="domain-landing-background-image" />
      </div>
 
      <div className="domain-landing-form-logo-container">
        <img src={kgisl_logo} alt="KGISL Logo" className="domain-landing-form-logo" />
      </div>
     
      <div className="domain-landing-container">
        {/* <div className="domain-landing-header">
  {!fromEmployeeForm && (
    // <button className="domain-landing-back-button" onClick={handleBackClick}>
    //   <FaChevronLeft />
    // </button>
    <button className="emp-form-back-button" onClick={handleBackClick}><FaChevronLeft /></button>
  )}
  <h1 className={`domain-landing-title ${fromEmployeeForm ? 'no-back-button' : ''}`}>
    {welcomeMessage}
  </h1>
</div> */}
<div className="domain-landing-header">
  {!fromEmployeeForm && (
    <>
      <button
        className="emp-form-back-button"
        onClick={handleBackClick}
        data-tooltip-id="back-tooltip"
        data-tooltip-content="Go back to home page"
        aria-label="Go back to home page"
      >
        <FaChevronLeft />
      </button>
      <Tooltip
        id="back-tooltip"
        place="bottom"
        className="custom-tooltip"
      />
    </>
  )}
  <h1 className={`domain-landing-title ${fromEmployeeForm ? 'no-back-button' : ''}`}>
    {welcomeMessage}
  </h1>
</div>
 
        <div className="domain-landing-card-grid">
          {/* The Menu Card (Image on Left) - Now a clickable Link */}
          <Link to="/menu-form" state={{ formData }} className="domain-landing-card-link">
            <div className="domain-landing-card domain-landing-card-menu">
              <div className="domain-landing-card-content">
                <div className="domain-landing-card-left">
                  <img src={theMenuImage} alt="The Menu" className="domain-landing-card-image" />
                </div>
                <div className="domain-landing-card-right">
                  <h2 className="domain-landing-card-title">The Menu</h2>
                  <p className="domain-landing-card-subtitle">Explore dining options</p>
                </div>
              </div>
            </div>
          </Link>
 
          {/* Cafeteria Card (Image on Right) */}
          <Link to="/cafeteria-form" state={{ formData }} className="domain-landing-card-link">
            <div className="domain-landing-card domain-landing-card-cafeteria">
              <div className="domain-landing-card-content">
                <div className="domain-landing-card-right">
                  <h2 className="domain-landing-card-title">Cafeteria</h2>
                  <p className="domain-landing-card-subtitle">View meal schedules & specials</p>
                </div>
                <div className="domain-landing-card-left">
                  <img src={cafeteriaImage} alt="Cafeteria" className="domain-landing-card-image" />
                </div>
              </div>
            </div>
          </Link>
 
          {/* Our Campus Card (Image on Left) */}
          <Link to="/our-campus" state={{ formData }} className="domain-landing-card-link">
            <div className="domain-landing-card domain-landing-card-campus">
              <div className="domain-landing-card-content">
                <div className="domain-landing-card-left">
                  <img src={campusImage} alt="Our Campus" className="domain-landing-card-image" />
                </div>
                <div className="domain-landing-card-right">
                  <h2 className="domain-landing-card-title">Our Campus</h2>
                  <p className="domain-landing-card-subtitle">Navigate facilities & services</p>
                </div>
              </div>
            </div>
          </Link>
 
          {/* Security Card (Image on Right) */}
          <Link to="/security" state={{ formData }} className="domain-landing-card-link">
            <div className="domain-landing-card domain-landing-card-security">
              <div className="domain-landing-card-content">
                <div className="domain-landing-card-right">
                  <h2 className="domain-landing-card-title">Security</h2>
                  <p className="domain-landing-card-subtitle">Access safety guidelines</p>
                </div>
                <div className="domain-landing-card-left">
                  <img src={securityImage} alt="Security" className="domain-landing-card-image" />
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
 
export default DomainLanding;