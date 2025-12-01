import React, { useState } from 'react';
import Lottie from 'lottie-react';
import experienceAnimation from '../assets/experience.json';
import kgisl_logo from '../assets/kgisl_logo_bg.png';
import EmployeeForm from './EmployeeForm';
import '../styles/SurveyLanding.css';
import siKGlogo from '../assets/siKGnatureV1.png';

const SurveyLanding = () => {
  const [animate, setAnimate] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleGetStarted = () => {
    setAnimate(true);
    setTimeout(() => setShowForm(true), 1000);
  };

  return (
    <div className='landing-form-logo-main'>
      {/* Animated gradient background */}
      <div className="gradient-background"></div>
      
      {/* Floating particles for ambiance */}
      <div className="floating-elements">
        <div className="floating-circle circle-1"></div>
        <div className="floating-circle circle-2"></div>
        <div className="floating-circle circle-3"></div>
        <div className="floating-circle circle-4"></div>
      </div>
      
      {/* Logo container */}
      <div className="landing-form-logo-container">
        <img src={kgisl_logo} alt="KGISL Logo" className="landing-form-logo" />
      </div>
      
      <div className={`landing-container ${animate ? 'animate' : ''}`}>
        {!showForm ? (
          <>
            <div className={`single-section ${animate ? 'shrink' : ''}`}>
              {/* Main content with glassmorphism effect */}
              <div className="get-started-container">
                <div className="content-glass-card">
                  <div className="title-container">
                    <h1 className="title">Feedback Made Easy</h1>
                    <div className="title-underline"></div>
                  </div>
                  <div className='logo-showcase-main'>
                  <div>
                  <div className="logo-showcase">
                    <img src={siKGlogo} alt="KGISL Logo" className="landing-form-logo1" />
                  </div>
                  
                  <p className="subtitle">
                    Empower your voice with seamless, confidential employee surveys.
                    {/* <span className="subtitle-accent">Transform workplace communication.</span> */}
                  </p>
                  </div>
                  
                  <button className="btn-get-started" onClick={handleGetStarted}>
                    <span className="btn-text">Get Started</span>
                    <span className="btn-arrow">→</span>
                  </button>
                  </div>
                </div>
              </div>
              
              {/* Background animation */}
              <Lottie
                className={`background-animation ${animate ? 'zoom-in' : ''}`}
                animationData={experienceAnimation}
                loop
                autoplay
                rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
              />
              
              {/* Decorative elements */}
              <div className="decorative-line line-1"></div>
              <div className="decorative-line line-2"></div>
            </div>
          </>
        ) : (
          <div className='employeeForm-mainhead'>
            <EmployeeForm />
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyLanding;