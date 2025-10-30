import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaChevronLeft } from 'react-icons/fa';
import { MdOutlineEventNote, MdOutlinePerson, MdOutlinePhone, MdGroup, MdOutlinePhotoCamera, MdOutlineDateRange } from 'react-icons/md';
import { TfiWrite } from 'react-icons/tfi';
import Lottie from 'react-lottie';
import SignaturePad from 'react-signature-canvas';
import toast, { Toaster } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import * as CryptoJS from 'crypto-js';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import successAnimation from '../assets/success.json';
import foodAnimation from '../assets/themenu.json';
import '../styles/MenuForm.css';

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
  animationData: foodAnimation,
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
  if (file.type === 'image/jpeg') return file; // already OK
  const img = await fileToHTMLImage(file);
  const blob = await imageToJpegBlob(img, { maxW, quality });
  const base = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
}

// Derive first/last name from formData/name fallback
function deriveNameParts(formData, menuData) {
  let firstName = formData.firstName?.trim();
  let lastName = formData.lastName?.trim();

  if ((!firstName || !lastName) && menuData.name) {
    const parts = menuData.name.trim().split(/\s+/);
    if (!firstName) firstName = parts.shift() || '';
    if (!lastName)  lastName  = parts.join(' ') || '';
  }

  return { firstName: firstName || '', lastName: lastName || '' };
}

function MenuForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const formData = location.state?.formData || {};

  const [menuData, setMenuData] = useState({
    eventName: '',
    eventDate: new Date(),
    name: '',
    contact: '',
    visitorType: '',
    idNumber: '',
    feedback: '',
    selfie: null,
    signature: null,
  });

  const [errors, setErrors] = useState({});
  const [showIdNumber, setShowIdNumber] = useState(false);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const sigCanvas = useRef({});
  const formRef = useRef(null);
  const signatureRef = useRef(null);
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

      setMenuData(prevData => ({
        ...prevData,
        name: fullName,
        contact: cleanContact,
        visitorType: formData.employeeType === 'KGISL' ? 'Staff' : 'Visitor'
      }));
    }
    if (formData.employeeType === 'KGISL') {
      setShowIdNumber(true);
      setMenuData(prevData => ({
        ...prevData,
        idNumber: formData.employeeId || ''
      }));
    }
  }, [formData]);

  useEffect(() => {
    if (!formRef.current) return;
    const formElements = formRef.current.querySelectorAll('input, textarea, select');
    const handleFocus = (event) => {
      event.target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  useEffect(() => {
    if (selfiePreview && feedbackRef.current) {
      feedbackRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selfiePreview]);

  const handleDateChange = (date) => {
    setMenuData(prevData => ({
      ...prevData,
      eventDate: date
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMenuData(prevData => ({ ...prevData, [name]: value }));

    if (name === 'visitorType') {
      const isStaff = value === 'Staff';
      setShowIdNumber(isStaff);
      if (!isStaff) {
        setMenuData(prevData => ({ ...prevData, idNumber: '' }));
      }
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

      setMenuData(prevData => ({ ...prevData, selfie: jpegFile }));

      const reader = new FileReader();
      reader.onloadend = () => setSelfiePreview(reader.result);
      reader.readAsDataURL(jpegFile);
    } catch (err) {
      console.error(err);
      toast.error('Could not process image. Please upload a JPEG/PNG.');
    }
  };

  const handleSignatureStart = () => {
    if (validateForm()) {
      setShowSignaturePad(true);
      setTimeout(() => {
        if (signatureRef.current) {
          signatureRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const handleSignatureEnd = () => {
    if (!sigCanvas.current.isEmpty()) {
      const dataUrl = sigCanvas.current.toDataURL('image/jpeg', 0.85);
      setMenuData(prevData => ({ ...prevData, signature: dataUrl }));
    }
  };

  const handleClearSignature = () => {
    sigCanvas.current.clear();
    setMenuData(prevData => ({ ...prevData, signature: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!menuData.eventName) newErrors.eventName = 'Event Name is required.';
    if (!menuData.eventDate) newErrors.eventDate = 'Event Date is required.';
    if (!menuData.name) newErrors.name = 'Name is required.';
    if (!menuData.contact) {
      newErrors.contact = 'Contact number is required.';
    } else if (!/^\d{10,15}$/.test(menuData.contact)) {
      newErrors.contact = 'Contact number must be 10–15 digits.';
    }
    if (!menuData.visitorType) newErrors.visitorType = 'Visitor/Staff status is required.';
    if (menuData.visitorType === 'Staff' && !menuData.idNumber) {
      newErrors.idNumber = 'ID Number is required for staff.';
    }
    if (!menuData.selfie) newErrors.selfie = 'A selfie is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!(validateForm() && menuData.signature)) {
      toast.error('Please complete the form and add your signature.');
      return;
    }

    try {
      // Convert selfie and signature to Base64
      const selfieBase64 = await fileToBase64(menuData.selfie);

      // Derive names for backend
      const { firstName, lastName } = deriveNameParts(formData, menuData);

      // Create payload object
      const payload = {
        firstName,
        lastName,
        name: menuData.name,
        email: formData.email || '',
        contact: menuData.contact,
        gender: formData.gender || '',
        employeeStatus: formData.employeeStatus || '',
        employeeType: formData.employeeType || '',
        employeeId: formData.employeeId || '',
        eventName: menuData.eventName,
        eventDate: menuData.eventDate ? format(menuData.eventDate, 'dd/MM/yyyy') : '',
        visitorType: menuData.visitorType,
        idNumber: menuData.visitorType === 'Staff' ? (menuData.idNumber || '') : '',
        feedback: menuData.feedback || '',
        formType: 'MenuFeedback',
        selfie: selfieBase64,
        signature: menuData.signature
      };

      console.log('Payload to encrypt:', payload);

      // Encrypt the payload
      const envelope = encryptClient(payload);
      console.log('Encrypted envelope:', envelope);

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

      console.log('Response status:', response.status);

      // Get encrypted response
      const encryptedResult = await response.json();
      console.log('Encrypted response:', encryptedResult);

      // Decrypt response
      let result;
      try {
        if (!encryptedResult.envelope) {
          throw new Error('No envelope in response');
        }
        result = decryptClient(encryptedResult.envelope);
        console.log('Decrypted result:', result);
      } catch (decryptError) {
        console.error('Decryption error:', decryptError);
        console.error('Response was:', encryptedResult);
        toast.error('Failed to decrypt server response');
        return;
      }

      if (response.ok) {
        console.log('Submission successful:', result);
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
    <div className="menu-form-wrapper-alt">
      <Toaster position="top-center" />
      {showSuccess ? (
        <div className="success-lottie-container-alt">
          <Lottie options={successOptions} height={200} width={200} />
        </div>
      ) : (
        <div className="menu-form-blur-container">
          <div className="menu-form-lottie-container">
            <Lottie options={defaultOptions} />
          </div>
          <div className="menu-form-content">
            <div className="menu-form-header-alt">
              <button className="menu-form-back-button-alt" onClick={handleBack}>
                <FaChevronLeft />
              </button>
              <p className="menu-form-title-alt">Menu Feedback</p>
            </div>

            <form className="menu-form-grid-alt" noValidate ref={formRef}>
              <div className="menu-form-group-alt">
                <label htmlFor="eventName" className="menu-form-label-alt">
                  <MdOutlineEventNote className="menu-label-icon" />
                  Name of Event
                </label>
                <input
                  type="text"
                  id="eventName"
                  name="eventName"
                  value={menuData.eventName}
                  onChange={handleChange}
                  className="menu-form-input-alt"
                  placeholder="Enter event name"
                />
                {errors.eventName && <p className="menu-form-error-alt">{errors.eventName}</p>}
              </div>

              <div className="menu-form-group-alt">
                <label htmlFor="eventDate" className="menu-form-label-alt">
                <MdOutlineDateRange className="menu-label-icon" />
                  Event Date
                </label>
                <DatePicker
                  id="eventDate"
                  selected={menuData.eventDate}
                  onChange={handleDateChange}
                  maxDate={new Date()}
                  minDate={new Date(new Date().setDate(new Date().getDate() - 6))}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Select event date"
                  className="menu-form-input-alt"
                />
                {errors.eventDate && <p className="menu-form-error-alt">{errors.eventDate}</p>}
              </div>

              <div className="menu-form-group-alt">
                <label htmlFor="name" className="menu-form-label-alt">
                  <MdOutlinePerson className="menu-label-icon" />
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={menuData.name}
                  onChange={handleChange}
                  className="menu-form-input-alt disabled"
                  disabled
                />
                {errors.name && <p className="menu-form-error-alt">{errors.name}</p>}
              </div>

              <div className="menu-form-group-alt">
                <label htmlFor="contact" className="menu-form-label-alt">
                  <MdOutlinePhone className="menu-label-icon" />
                  Mobile Number
                </label>
                <input
                  type="tel"
                  id="contact"
                  name="contact"
                  value={menuData.contact}
                  onChange={handleChange}
                  className="menu-form-input-alt disabled"
                  disabled
                />
                {errors.contact && <p className="menu-form-error-alt">{errors.contact}</p>}
              </div>

              <div className="menu-form-group-alt">
                <label htmlFor="visitorType" className="menu-form-label-alt">
                  <MdGroup className="menu-label-icon" />
                  Visitor or Staff
                </label>
                <select
                  id="visitorType"
                  name="visitorType"
                  value={menuData.visitorType}
                  onChange={handleChange}
                  className="menu-form-select-alt"
                >
                  <option value="">Select Type</option>
                  <option value="Visitor">Visitor</option>
                  <option value="Staff">Staff</option>
                </select>
                {errors.visitorType && <p className="menu-form-error-alt">{errors.visitorType}</p>}
              </div>

              {showIdNumber && (
                <div className="menu-form-group-alt">
                  <label htmlFor="idNumber" className="menu-form-label-alt">ID Number</label>
                  <input
                    type="text"
                    id="idNumber"
                    name="idNumber"
                    value={menuData.idNumber}
                    onChange={handleChange}
                    className="menu-form-input-alt"
                    placeholder="Enter ID number"
                  />
                  {errors.idNumber && <p className="menu-form-error-alt">{errors.idNumber}</p>}
                </div>
              )}

              <div className="menu-form-group-alt selfie-group">
                <label className="menu-form-label-alt">
                  <MdOutlinePhotoCamera className="menu-label-icon" />
                  Your Selfie Image
                </label>
                <input
                  type="file"
                  id="selfie"
                  name="selfie"
                  accept="image/jpeg,image/png"
                  onChange={handleSelfieChange}
                  className="menu-form-input-alt"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="menu-selfie-button-alt"
                  onClick={() => document.getElementById('selfie').click()}
                >
                  <MdOutlinePhotoCamera className="selfie-icon-alt" />
                  Upload Selfie
                </button>
                {selfiePreview && <img src={selfiePreview} alt="Selfie Preview" className="selfie-preview-alt" />}
                {errors.selfie && <p className="menu-form-error-alt">{errors.selfie}</p>}
              </div>

              <div className="menu-form-group-alt" ref={feedbackRef}>
                <label htmlFor="feedback" className="menu-form-label-alt">
                  <TfiWrite className="menu-label-icon" />
                  Your Feedback
                </label>
                <textarea
                  id="feedback"
                  name="feedback"
                  value={menuData.feedback}
                  onChange={handleChange}
                  className="menu-form-textarea-alt"
                  placeholder="Share your feedback about the menu..."
                />
              </div>

              {showSignaturePad ? (
                <div className="menu-signature-container" ref={signatureRef}>
                  <p className="menu-signature-heading">Please sign below:</p>
                  <SignaturePad
                    ref={sigCanvas}
                    penColor="#3d2c20"
                    canvasProps={{ width: 450, height: 200, className: 'menu-signature-canvas' }}
                    onEnd={handleSignatureEnd}
                  />
                  <div className="menu-signature-buttons">
                    <button
                      type="button"
                      className="clear-button-alt"
                      onClick={handleClearSignature}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      className="menu-submit-button-alt"
                      onClick={handleSubmit}
                    >
                      Submit
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="menu-form-submit-button-alt"
                  onClick={handleSignatureStart}
                >
                  Signature
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MenuForm;