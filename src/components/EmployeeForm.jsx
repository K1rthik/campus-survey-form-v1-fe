import React, { useState, useEffect, useRef } from 'react';
import { FaUser, FaEnvelope, FaPhone, FaVenusMars, FaBriefcase, FaIdBadge, FaChevronLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import backgroundImage from '../assets/wave2.jpg';
import kgisl_logo from '../assets/kgisl_logo_bg.png';
import '../styles/EmployeeForm.css';
 
function EmployeeForm() {
  const navigate = useNavigate();
 
  // Refs for DOM elements to enable smooth scrolling
  const formRef = useRef(null);
  const employeeTypeRef = useRef(null);
  const employeeIdRef = useRef(null);
 
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contact: '',
    gender: '',
    employeeStatus: '',
    employeeType: '',
    employeeId: '',
  });
 
  const [errors, setErrors] = useState({});
  const [showEmployeeId, setShowEmployeeId] = useState(false);
  const [isLoadingGender, setIsLoadingGender] = useState(false);
 
  // Gender prediction function
  const predictGender = async (name) => {
    try {
      setIsLoadingGender(true);
      const response = await fetch(`https://api.genderize.io/?name=${encodeURIComponent(name)}`);
      const data = await response.json();
      console.log('Gender prediction response:', data);
     
      if (data.gender) {
        // Map API response to dropdown values
        const genderMap = {
          'male': 'Male',
          'female': 'Female'
        };
       
        const predictedGender = genderMap[data.gender.toLowerCase()];
        if (predictedGender) {
          setFormData(prevData => ({
            ...prevData,
            gender: predictedGender
          }));
        }
      }
    } catch (error) {
      console.error('Error predicting gender:', error);
    } finally {
      setIsLoadingGender(false);
    }
  };
 
  // Effect for gender prediction when names change
  useEffect(() => {
    const { firstName, lastName } = formData;
   
    // Only predict if firstName is provided and gender is not already manually set
    if (firstName.trim()) {
      // Use a timeout to debounce API calls while user is typing
      const timeoutId = setTimeout(() => {
        // Determine which name to use for prediction
        let nameForPrediction = firstName.trim();
       
        // If lastName is provided, combine both names
        if (lastName.trim()) {
          nameForPrediction = `${firstName.trim()} ${lastName.trim()}`;
        }
       
        // Only predict if names have actually changed and gender field is empty or we want to re-predict
        predictGender(nameForPrediction);
      }, 1000); // 1 second delay to avoid too many API calls
 
      return () => clearTimeout(timeoutId);
    }
  }, [formData.firstName, formData.lastName]);
 
  // Effect to add smooth-scrolling behavior to all input and select fields
  useEffect(() => {
    const formElements = formRef.current?.querySelectorAll('input, select') ?? [];
    const handleFocus = (event) => {
      event.target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    };
 
    formElements.forEach(element => {
      element.addEventListener('focus', handleFocus);
    });
 
    return () => {
      formElements.forEach(element => {
        element.removeEventListener('focus', handleFocus);
      });
    };
  }, []);
 
  // Effect to scroll to Employee Type when Employee Status is set to 'Employee'
  useEffect(() => {
    if (formData.employeeStatus === 'Employee' && employeeTypeRef.current) {
      setTimeout(() => {
        employeeTypeRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }, [formData.employeeStatus]);
 
  // Effect to scroll to Employee ID when Employee Type is set to 'KGISL'
  useEffect(() => {
    if (showEmployeeId && employeeIdRef.current) {
      setTimeout(() => {
        employeeIdRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }, [showEmployeeId]);
 
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
 
    if (name === 'employeeStatus') {
      // Clear employeeType and employeeId if status changes to 'Student' or 'Entrepreneur'
      if (value === 'Student' || value === 'Entrepreneur') {
        setFormData((prevData) => ({ ...prevData, employeeType: '', employeeId: '' }));
        setShowEmployeeId(false);
      }
    }
 
    if (name === 'employeeType') {
      setShowEmployeeId(value === 'KGISL');
      if (value !== 'KGISL') {
        setFormData((prevData) => ({ ...prevData, employeeId: '' }));
      }
    }
  };
 
  const validate = () => {
    const newErrors = {};
    if (!formData.firstName) newErrors.firstName = 'First Name is required';
    if (!formData.lastName) newErrors.lastName = 'Last Name is required';
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email address is invalid';
    }
    if (!formData.contact) {
      newErrors.contact = 'Contact number is required';
    } else if (!/^\d{10}$/.test(formData.contact)) {
      newErrors.contact = 'Contact number must be 10 digits';
    }
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.employeeStatus) newErrors.employeeStatus = 'Employee Status is required';
 
    // Conditional validation based on employeeStatus.
    // Employee Type is only required if the status is 'Employee'.
    if (formData.employeeStatus === 'Employee') {
      if (!formData.employeeType) {
        newErrors.employeeType = 'Employee Type is required';
      }
      if (formData.employeeType === 'KGISL' && !formData.employeeId) {
        newErrors.employeeId = 'Employee ID is required for KGISL employees';
      }
    }
 
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
 
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      //console.log('Form data submitted:', formData);
      navigate('/domain-landing', {
        state: {
          formData,
          fromEmployeeForm: true  // Add this flag
        }
      });
    } else {
      //console.log('Form has errors:', errors);
    }
  };
 
  const handleBack = () => {
    navigate(-1);
  };
 
  return (
    <div className="emp-form-main-wrapper">
      <div className="emp-form-background-image-container">
        <img src={backgroundImage} alt="Background Wave Pattern" className="emp-form-background-image" />
      </div>
 
      <div className="emp-form-logo-container">
        <img src={kgisl_logo} alt="KGISL Logo" className="emp-form-logo" />
      </div>
 
      <div className="emp-form-container">
        <div className="emp-form-header">
          <button className="emp-form-back-button" onClick={handleBack}>
            <FaChevronLeft />
          </button>
          <p className="emp-form-title">User Information</p>
          <div className="emp-form-header-right"></div>
        </div>
 
        <div className="emp-form-scroll-container">
          <form onSubmit={handleSubmit} className="emp-form-grid" noValidate ref={formRef}>
            {/* Employee Status moved to the top */}
            <div className="emp-form-group">
              <label className="emp-form-label">
                <FaIdBadge className="emp-form-icon" />
                User Type
              </label>
              <div className="emp-form-radio-group">
                <label className="emp-form-radio-label">
                  <input
                    type="radio"
                    name="employeeStatus"
                    value="Visitors"
                    checked={formData.employeeStatus === 'Visitors'}
                    onChange={handleChange}
                  />
                  Visitor
                </label>
                <label className="emp-form-radio-label">
                  <input
                    type="radio"
                    name="employeeStatus"
                    value="Employee"
                    checked={formData.employeeStatus === 'Employee'}
                    onChange={handleChange}
                  />
                  Employee
                </label>
                <label className="emp-form-radio-label">
                  <input
                    type="radio"
                    name="employeeStatus"
                    value="Student"
                    checked={formData.employeeStatus === 'Student'}
                    onChange={handleChange}
                  />
                  Student
                </label>
                <label className="emp-form-radio-label">
                  <input
                    type="radio"
                    name="employeeStatus"
                    value="Entrepreneur"
                    checked={formData.employeeStatus === 'Entrepreneur'}
                    onChange={handleChange}
                  />
                  Entrepreneur
                </label>
                <label className="emp-form-radio-label">
                  <input
                    type="radio"
                    name="employeeStatus"
                    value="Others"
                    checked={formData.employeeStatus === 'Others'}
                    onChange={handleChange}
                  />
                  Others
                </label>
              </div>
              {errors.employeeStatus && <p className="emp-form-error">{errors.employeeStatus}</p>}
            </div>
 
            {/* Conditionally render Employee Type field only for 'Employee' status */}
            {formData.employeeStatus === 'Employee' && (
              <>
                <div className="emp-form-group" ref={employeeTypeRef}>
                  <label htmlFor="employeeType" className="emp-form-label">
                    <FaBriefcase className="emp-form-icon" />
                    Employee Type
                  </label>
                  <select
                    id="employeeType"
                    name="employeeType"
                    value={formData.employeeType}
                    onChange={handleChange}
                    className="emp-form-select"
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="KGISL">KGISL</option>
                    <option value="External">External</option>
                  </select>
                  {errors.employeeType && <p className="emp-form-error">{errors.employeeType}</p>}
                </div>
 
                {showEmployeeId && (
                  <div className="emp-form-group emp-form-group-employee-id" ref={employeeIdRef}>
                    <label htmlFor="employeeId" className="emp-form-label">
                      <FaIdBadge className="emp-form-icon" />
                      Employee ID
                    </label>
                    <input
                      type="text"
                      id="employeeId"
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleChange}
                      className="emp-form-input"
                      placeholder="Enter employee ID"
                      required
                      minLength="1"
                      maxLength="20"
                    />
                    {errors.employeeId && <p className="emp-form-error">{errors.employeeId}</p>}
                  </div>
                )}
              </>
            )}
 
            {/* First Name */}
            <div className="emp-form-group">
              <label htmlFor="firstName" className="emp-form-label">
                <FaUser className="emp-form-icon" />
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="emp-form-input"
                placeholder="Enter first name"
                required
                minLength="2"
                maxLength="50"
              />
              {errors.firstName && <p className="emp-form-error">{errors.firstName}</p>}
            </div>
 
            {/* Last Name */}
            <div className="emp-form-group">
              <label htmlFor="lastName" className="emp-form-label">
                <FaUser className="emp-form-icon" />
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="emp-form-input"
                placeholder="Enter last name"
                required
                minLength="2"
                maxLength="50"
              />
              {errors.lastName && <p className="emp-form-error">{errors.lastName}</p>}
            </div>
 
            {/* Email */}
            <div className="emp-form-group">
              <label htmlFor="email" className="emp-form-label">
                <FaEnvelope className="emp-form-icon" />
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="emp-form-input"
                placeholder="example@domain.com"
                required
              />
              {errors.email && <p className="emp-form-error">{errors.email}</p>}
            </div>
 
            {/* Contact */}
            <div className="emp-form-group">
              <label htmlFor="contact" className="emp-form-label">
                <FaPhone className="emp-form-icon" />
                Contact
              </label>
              <input
                type="tel"
                id="contact"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                className="emp-form-input"
                placeholder="10-digit number"
                pattern="[0-9]{10}"
                required
              />
              {errors.contact && <p className="emp-form-error">{errors.contact}</p>}
            </div>
 
            {/* Gender */}
            <div className="emp-form-group">
              <label htmlFor="gender" className="emp-form-label">
                <FaVenusMars className="emp-form-icon" />
                Gender {isLoadingGender && <span style={{ fontSize: '12px', color: '#666' }}>(Predicting...)</span>}
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="emp-form-select"
                required
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && <p className="emp-form-error">{errors.gender}</p>}
            </div>
 
            <div className="emp-form-actions">
              <button type="submit" className="emp-form-button emp-form-next-button">Next</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
 
export default EmployeeForm;