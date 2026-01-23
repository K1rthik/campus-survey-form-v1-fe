import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaChevronLeft } from 'react-icons/fa';
import { MdOutlineEventNote, MdOutlinePerson, MdOutlinePhone, MdGroup, MdOutlinePhotoCamera, MdOutlineDateRange, MdOutlineCategory} from 'react-icons/md';
import { TfiWrite } from 'react-icons/tfi';
import Lottie from 'react-lottie';
import toast, { Toaster } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import * as CryptoJS from 'crypto-js';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import successAnimation from '../assets/success.json';
import coffeeAnimation from '../assets/thecoffee1.json';
import '../styles/CafeteriaForm.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Encryption constants (must match server-side)
const ENCRYPTION_KEY = 'aBfGhIjKlMnOpQrStUvWxYz012345678'; // Exactly 32 bytes for AES-256
const ENCRYPTION_IV = '1234567890123456'; // Exactly 16 bytes for IV
const VERSION_HEADER = 'v:1,';

// Client-side encryption function
function encryptClient(dataObject) {
  try {
    const jsonString = JSON.stringify(dataObject);
    const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
    const iv = CryptoJS.enc.Utf8.parse(ENCRYPTION_IV);
    
    const encrypted = CryptoJS.AES.encrypt(jsonString, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    return VERSION_HEADER + encrypted.toString();
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
}

// Client-side decryption function
function decryptClient(envelope) {
  try {
    if (!envelope || !envelope.startsWith(VERSION_HEADER)) {
      throw new Error('Invalid envelope format: missing version header');
    }
    
    const ciphertext = envelope.substring(VERSION_HEADER.length);
    const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
    const iv = CryptoJS.enc.Utf8.parse(ENCRYPTION_IV);
    
    const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    if (!jsonString) {
      throw new Error('Decryption failed: empty result');
    }
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
}

// Helper function to convert File to Base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Lottie animation options
const defaultOptions = {
  loop: true,
  autoplay: true,
  animationData: coffeeAnimation,
  rendererSettings: { preserveAspectRatio: 'xMidYMid slice' }
};

const successOptions = {
  loop: false,
  autoplay: true,
  animationData: successAnimation,
  rendererSettings: { preserveAspectRatio: 'xMidYMid slice' },
};

// Reads a File into an HTMLImageElement
function fileToHTMLImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Draws an image to canvas and returns a JPEG Blob
async function imageToJpegBlob(img, { maxW = 1600, quality = 0.85 } = {}) {
  const scale = img.width > maxW ? maxW / img.width : 1;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  return await new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
  );
}

// Ensure any image File becomes a JPEG File (downscaled & compressed)
async function normalizeToJpegFile(file, { maxW = 1600, quality = 0.85 } = {}) {
  if (file.type === 'image/jpeg') return file;
  const img = await fileToHTMLImage(file);
  const blob = await imageToJpegBlob(img, { maxW, quality });
  const base = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
}

// Derive first/last name from formData/name fallback
function deriveNameParts(formData, data) {
  let firstName = formData.firstName?.trim();
  let lastName = formData.lastName?.trim();

  if ((!firstName || !lastName) && data.name) {
    const parts = data.name.trim().split(/\s+/);
    if (!firstName) firstName = parts.shift() || '';
    if (!lastName)  lastName  = parts.join(' ') || '';
  }
  return { firstName: firstName || '', lastName: lastName || '' };
}

function CafeteriaForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const formData = location.state?.formData || {};
console.log("formData==>",formData);

  const [cafeteriaData, setCafeteriaData] = useState({
    selectionType: '', // Cafeteria feedback category selection
    eventName: '',
    eventDate: new Date(),
    name: '',
    contact: '',
    visitorType: '',
    idNumber: '',
    feedback: '',
    selfie: null,
  });

  const [errors, setErrors] = useState({});
  const [showIdNumber, setShowIdNumber] = useState(false);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const formRef = useRef(null);
  const feedbackRef = useRef(null);

  useEffect(() => {
    if (!API_BASE_URL) {
      console.error('VITE_API_BASE_URL is missing! Check your environment config.');
    }
  }, []);

  useEffect(() => {
    if (formData.firstName || formData.lastName) {
      const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();

      let cleanContact = formData.contact || '';
      try {
        const parsed = JSON.parse(cleanContact);
        if (typeof parsed === 'object' && parsed.contact) cleanContact = parsed.contact;
      } catch (_) {}

      setCafeteriaData(prev => ({
        ...prev,
        name: fullName,
        contact: cleanContact,
        // Set visitorType based on employeeStatus: "Visitors" -> "Visitor", otherwise check employeeType
        visitorType: formData.employeeStatus === 'Visitors' ? 'Visitor' : 
                    (formData.employeeType === 'KGISL' ? 'Staff' : 'Visitor')
      }));
    }

    // Show ID Number field for KGISL employees
    if (formData.employeeType === 'KGISL') {
      setShowIdNumber(true);
      setCafeteriaData(prev => ({ ...prev, idNumber: formData.employeeId || '' }));
    }
  }, [formData]);

  useEffect(() => {
    if (!formRef.current) return;
    const formElements = formRef.current.querySelectorAll('input, textarea, select');
    const handleFocus = (event) => {
      event.target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    formElements.forEach(el => el.addEventListener('focus', handleFocus));
    return () => {
      formElements.forEach(el => el.removeEventListener('focus', handleFocus));
    };
  }, []);

  useEffect(() => {
    if (selfiePreview && feedbackRef.current) {
      feedbackRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selfiePreview]);

  const handleDateChange = (date) => {
    setCafeteriaData(prev => ({ ...prev, eventDate: date }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCafeteriaData(prev => ({ ...prev, [name]: value }));

    if (name === 'visitorType') {
      const isStaff = value === 'Staff';
      setShowIdNumber(isStaff);
      if (!isStaff) {
        setCafeteriaData(prev => ({ ...prev, idNumber: '' }));
      }
    }

    // Clear eventName when selection type changes
    if (name === 'selectionType') {
      setCafeteriaData(prev => ({ ...prev, eventName: '' }));
    }
  };

  const handleSelfieChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image too large. Please select a smaller image.');
        return;
      }

      const jpegFile = await normalizeToJpegFile(file, { maxW: 1600, quality: 0.85 });

      if (jpegFile.size > 5 * 1024 * 1024) {
        toast.error('Image must be under 5 MB.');
        return;
      }

      setCafeteriaData(prev => ({ ...prev, selfie: jpegFile }));

      const reader = new FileReader();
      reader.onloadend = () => setSelfiePreview(reader.result);
      reader.readAsDataURL(jpegFile);
    } catch (err) {
      console.error(err);
      toast.error('Could not process image. Please upload a JPEG/PNG.');
    }
  };

  // Dynamic label and placeholder based on selection type and employee status
  const getEventFieldLabel = () => {
    // If Visitors, always show "Purpose of visit"
    if (formData.employeeStatus === 'Visitors') {
      return 'Purpose of visit';
    }
    
    // For cafeteria feedback categories, show appropriate event field label
    if (cafeteriaData.selectionType === 'others-suggestions') {
      return 'Topic/Subject';
    }
    
    // For all other cafeteria categories, show generic event/activity name
    return 'Event/Activity Name';
  };

  const getEventFieldPlaceholder = () => {
    // If Visitors, always show purpose placeholder
    if (formData.employeeStatus === 'Visitors') {
      return 'Enter purpose of visit';
    }
    
    // For cafeteria feedback categories, show appropriate placeholder
    if (cafeteriaData.selectionType === 'others-suggestions') {
      return 'Enter topic or subject';
    }
    
    // For all other cafeteria categories
    return 'Enter event or activity name';
  };

  const getDateFieldLabel = () => {
    // If Visitors, show "Date of visit"
    if (formData.employeeStatus === 'Visitors' || formData.employeeStatus === 'Employee' ) {
      return 'Visit date';
    }
    // Otherwise show "Event Date"
    return 'Event Date';
  };

  const getDateFieldPlaceholder = () => {
    // If Visitors, show visit date placeholder
    if (formData.employeeStatus === 'Visitors') {
      return 'Select date of visit';
    }
    // Otherwise show event date placeholder
    return 'Select event date';
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!cafeteriaData.selectionType) newErrors.selectionType = 'Feedback category is required.';
    if (!cafeteriaData.eventName) {
      let fieldName;
      if (formData.employeeStatus === 'Visitors') {
        fieldName = 'Purpose of visit';
      } else if (cafeteriaData.selectionType === 'others-suggestions') {
        fieldName = 'Topic/Subject';
      } else {
        fieldName = 'Event/Activity Name';
      }
      newErrors.eventName = `${fieldName} is required.`;
    }
   
    if (!cafeteriaData.eventDate) {
      const dateFieldName = formData.employeeStatus === 'Visitors' ? 'Date of visit' : 'Event Date';
      newErrors.eventDate = `${dateFieldName} is required.`;
    }
    
    if (!cafeteriaData.name) newErrors.name = 'Name is required.';
    if (!cafeteriaData.contact) {
      newErrors.contact = 'Contact number is required.';
    } else if (!/^\d{10,15}$/.test(cafeteriaData.contact)) {
      newErrors.contact = 'Contact number must be 10–15 digits.';
    }
    if (!cafeteriaData.visitorType) newErrors.visitorType = 'Visitor/Staff status is required.';
    if (cafeteriaData.visitorType === 'Staff' && !cafeteriaData.idNumber) {
      newErrors.idNumber = 'ID Number is required for staff.';
    }
    if (!cafeteriaData.selfie) newErrors.selfie = 'A selfie is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please complete all required fields.');
      return;
    }

    if (!formData.email || !String(formData.email).trim()) {
      toast.error('Email is required.');
      return;
    }

    try {
      // Convert selfie to Base64
      const selfieBase64 = await fileToBase64(cafeteriaData.selfie);

      // Derive names for backend
      const { firstName, lastName } = deriveNameParts(formData, cafeteriaData);

      // Create payload object (without signature)
      const payload = {
        firstName,
        lastName,
        name: cafeteriaData.name,
        email: formData.email || '',
        contact: cafeteriaData.contact,
        gender: formData.gender || '',
        employeeStatus: formData.employeeStatus || '',
        employeeType: formData.employeeType || '',
        employeeId: formData.employeeId || '',
        selectionType: cafeteriaData.selectionType,
        eventName: cafeteriaData.eventName,
        eventDate: cafeteriaData.eventDate ? format(cafeteriaData.eventDate, 'dd/MM/yyyy') : '',
        visitorType: cafeteriaData.visitorType,
        idNumber: cafeteriaData.visitorType === 'Staff' ? (cafeteriaData.idNumber || '') : '',
        feedback: cafeteriaData.feedback || '',
        formType: 'CafeteriaFeedback',
        selfie: selfieBase64
      };

      // Encrypt the payload
      const envelope = encryptClient(payload);

      if (!envelope || !envelope.startsWith('v:1,')) {
        throw new Error('Encryption failed - invalid envelope format');
      }

      // Send encrypted request
      const response = await fetch(`${API_BASE_URL}/form-submission/add-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ envelope })
      });

      // Get encrypted response
      const encryptedResult = await response.json();

      // Decrypt response
      let result;
      try {
        if (!encryptedResult.envelope) {
          throw new Error('No envelope in response');
        }
        result = decryptClient(encryptedResult.envelope);
      } catch (decryptError) {
        console.error('Decryption error:', decryptError);
        console.error('Response was:', encryptedResult);
        toast.error('Failed to decrypt server response');
        return;
      }

      if (response.ok) {
        setShowSuccess(true);
        toast.success(result.message || 'Feedback submitted successfully!');
        setTimeout(() => {
          setShowSuccess(false);
          navigate('/domain-landing', { state: { formData } });
        }, 2000);
      } else {
        toast.error(result.error || 'Submission failed. Please try again.');
      }
    } catch (error) {
      console.error('Submission failed:', error);
      toast.error(`Submission failed: ${error.message}`);
    }
  };

  const handleBack = () => {
    navigate('/domain-landing', { state: { formData } });
  };

  return (
    <div className="cafeteria-form-wrapper">
      <Toaster position="top-center" />
      {showSuccess ? (
        <div className="success-lottie-container-alt">
          <Lottie options={successOptions} height={200} width={200} />
        </div>
      ) : (
        <div className="cafeteria-form-blur-container">
          <div className="cafeteria-form-lottie-container">
            <Lottie options={defaultOptions} />
          </div>
          <div className="cafeteria-form-content">
            <div className="cafeteria-form-header">
              <button className="cafeteria-form-back-button" onClick={handleBack}>
                <FaChevronLeft />
              </button>
              <p className="cafeteria-form-title">Cafeteria Feedback</p>
            </div>

            <form className="cafeteria-form-grid" onSubmit={handleSubmit} noValidate ref={formRef} style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
              {/* Cafeteria Feedback Category Dropdown */}
              <div className="cafeteria-form-group" style={{ width: '100%', maxWidth: '100%' }}>
                <label htmlFor="selectionType" className="cafeteria-form-label">
                  <MdOutlineCategory className="cafeteria-label-icon" />
                  Feedback Category
                </label>
                <select
                  id="selectionType"
                  name="selectionType"
                  value={cafeteriaData.selectionType}
                  onChange={handleChange}
                  className="cafeteria-form-select"
                  style={{ 
                    width: '100%', 
                    maxWidth: '100%', 
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  <option value="">Select Category</option>
                  <option value="food-quality">Food Quality</option>
                  <option value="menu-variety">Menu & Variety</option>
                  <option value="hygiene-cleanliness">Hygiene & Cleanliness</option>
                  <option value="service-staff">Service & Staff</option>
                  <option value="waiting-time">Waiting Time</option>
                  <option value="kafe-app">Kafe App / Online Ordering</option>
                  <option value="item-availability">Item Availability</option>
                  <option value="seating-ambience">Seating & Ambience</option>
                  <option value="others-suggestions">Others / Suggestions</option>
                </select>
                {errors.selectionType && <p className="cafeteria-form-error">{errors.selectionType}</p>}
              </div>

              {/* Dynamic Event/Topic Name Field */}
              <div className="cafeteria-form-group">
                <label htmlFor="eventName" className="cafeteria-form-label">
                  <MdOutlineEventNote className="cafeteria-label-icon" />
                  {getEventFieldLabel()}
                </label>
                <input
                  type="text"
                  id="eventName"
                  name="eventName"
                  value={cafeteriaData.eventName}
                  onChange={handleChange}
                  className="cafeteria-form-input"
                  placeholder={getEventFieldPlaceholder()}
                />
                {errors.eventName && <p className="cafeteria-form-error">{errors.eventName}</p>}
              </div>

              <div className="cafeteria-form-group">
                <label htmlFor="eventDate" className="cafeteria-form-label">
                  <MdOutlineDateRange className="cafeteria-label-icon" />
                  {getDateFieldLabel()}
                </label>
                <DatePicker
                  id="eventDate"
                  selected={cafeteriaData.eventDate}
                  onChange={handleDateChange}
                  maxDate={new Date()}
                  minDate={new Date(new Date().setDate(new Date().getDate() - 6))}
                  dateFormat="dd/MM/yyyy"
                  placeholderText={getDateFieldPlaceholder()}
                  className="cafeteria-form-input"
                />
                {errors.eventDate && <p className="cafeteria-form-error">{errors.eventDate}</p>}
              </div>

              <div className="cafeteria-form-group">
                <label htmlFor="name" className="cafeteria-form-label">
                  <MdOutlinePerson className="cafeteria-label-icon" />
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={cafeteriaData.name}
                  onChange={handleChange}
                  className="cafeteria-form-input disabled"
                  disabled
                />
                {errors.name && <p className="cafeteria-form-error">{errors.name}</p>}
              </div>

              <div className="cafeteria-form-group">
                <label htmlFor="contact" className="cafeteria-form-label">
                  <MdOutlinePhone className="cafeteria-label-icon" />
                  Mobile Number
                </label>
                <input
                  type="tel"
                  id="contact"
                  name="contact"
                  value={cafeteriaData.contact}
                  onChange={handleChange}
                  className="cafeteria-form-input disabled"
                  disabled
                />
                {errors.contact && <p className="cafeteria-form-error">{errors.contact}</p>}
              </div>

              <div className="cafeteria-form-group">
                <label htmlFor="visitorType" className="cafeteria-form-label">
                  <MdGroup className="cafeteria-label-icon" />
                  Visitor or Staff
                </label>
                <select
                  id="visitorType"
                  name="visitorType"
                  value={cafeteriaData.visitorType}
                  onChange={handleChange}
                  className="cafeteria-form-select"
                >
                  <option value="">Select Type</option>
                  <option value="Visitor">Visitor</option>
                  <option value="Staff">Staff</option>
                </select>
                {errors.visitorType && <p className="cafeteria-form-error">{errors.visitorType}</p>}
              </div>

              {showIdNumber && (
                <div className="cafeteria-form-group">
                  <label htmlFor="idNumber" className="cafeteria-form-label">ID Number</label>
                  <input
                    type="text"
                    id="idNumber"
                    name="idNumber"
                    value={cafeteriaData.idNumber}
                    onChange={handleChange}
                    className="cafeteria-form-input"
                    placeholder="Enter ID number"
                  />
                  {errors.idNumber && <p className="cafeteria-form-error">{errors.idNumber}</p>}
                </div>
              )}

              <div className="cafeteria-form-group selfie-group">
                <label className="cafeteria-form-label">
                  <MdOutlinePhotoCamera className="cafeteria-label-icon" />
                  Upload Image
                </label>
                <input
                  type="file"
                  id="selfie"
                  name="selfie"
                  accept="image/jpeg,image/png"
                  onChange={handleSelfieChange}
                  className="cafeteria-form-input"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="selfie-button"
                  onClick={() => document.getElementById('selfie').click()}
                >
                  <MdOutlinePhotoCamera className="selfie-icon" />
                  Upload Image
                </button>
                {selfiePreview && <img src={selfiePreview} alt="Selfie Preview" className="selfie-preview" />}
                {errors.selfie && <p className="cafeteria-form-error">{errors.selfie}</p>}
              </div>

              <div className="cafeteria-form-group" ref={feedbackRef}>
                <label htmlFor="feedback" className="cafeteria-form-label">
                  <TfiWrite className="cafeteria-label-icon" />
                  Your Feedback, with suggestion for Improvement
                </label>
                <textarea
                  id="feedback"
                  name="feedback"
                  value={cafeteriaData.feedback}
                  onChange={handleChange}
                  className="cafeteria-form-textarea"
                  placeholder="Share your suggestions and feedback about the cafeteria..."
                />
              </div>

              {/* Direct Submit Button */}
              <button
                type="submit"
                className="cafeteria-form-submit-button"
              >
                 Post Feedback
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CafeteriaForm;