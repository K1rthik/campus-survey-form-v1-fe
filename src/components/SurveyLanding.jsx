import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import rcbgAnimation from '../assets/rcbg.json';
import kgisl_logo from '../assets/kgisl_logo.png';
import EmployeeForm from './EmployeeForm';
import '../styles/SurveyLanding.css';
import siKGlogo from '../assets/siKgnature.png'

const Particle = ({ style }) => {
  return <div className="particle" style={style} />;
};

const SurveyLanding = () => {
  const [animate, setAnimate] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 100 }, () => ({
      top: Math.random() * 90 + '%',
      left: Math.random() * 90 + '%',
      animationDelay: (Math.random() * 10).toFixed(2) + 's',
      animationDuration: (5 + Math.random() * 5).toFixed(2) + 's',
      size: 1 + Math.random() * 1
    }));
    setParticles(newParticles);
  }, []);

  const handleGetStarted = () => {
    setAnimate(true);
    setTimeout(() => setShowForm(true), 1000);
  };

  return (
    <>
    <div className="landing-form-logo-container">
        <img src={kgisl_logo} alt="KGISL Logo" className="landing-form-logo" />
      </div>
    <div className={`landing-container ${animate ? 'animate' : ''}`}>
      {!showForm ? (
        <>
          <div className={`single-section ${animate ? 'shrink' : ''}`}>
            <div className="get-started-container">
              <h1 className="title">Feedback Made Easy</h1>
              <p className="subtitle">Empower your voice with seamless, confidential employee surveys.</p>
              <img src={siKGlogo} alt="KGISL Logo" className="landing-form-logo1" />
              <button className="btn-get-started" onClick={handleGetStarted}>Get Started</button>
            </div>
            {particles.map((p, i) => (
              <Particle
                key={i}
                style={{
                  top: p.top,
                  left: p.left,
                  animationDelay: p.animationDelay,
                  animationDuration: p.animationDuration,
                  width: p.size,
                  height: p.size
                }}
              />
            ))}
            <Lottie
              className={`background-animation ${animate ? 'zoom-in' : ''}`}
              animationData={rcbgAnimation}
              loop
              autoplay
              rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
            />
          </div>
        </>
      ) : (
        <div>
          <EmployeeForm />
        </div>
      )}
    </div>
    </>
  );
};

export default SurveyLanding;