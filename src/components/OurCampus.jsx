import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaChevronLeft } from 'react-icons/fa';
import { MdOutlineEventNote, MdOutlinePerson, MdOutlinePhone, MdGroup, MdOutlinePhotoCamera, MdOutlineBadge, MdOutlineDateRange } from 'react-icons/md';
import { TfiWrite } from 'react-icons/tfi';
import Lottie from 'react-lottie';
import SignaturePad from 'react-signature-canvas';
import toast, { Toaster } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import CryptoJS from 'crypto-js';
import "react-datepicker/dist/react-datepicker.css";
import buildingAnimation from '../assets/Building.json';
import successAnimation from '../assets/success.json';
import '../styles/OurCampus.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Encryption constants (must match server-side)
const ENCRYPTION_KEY = 'aBfGhIjKlMnOpQrStUvWxYz012345678'; // Exactly 32 bytes for AES-256
const ENCRYPTION_IV = '1234567890123456'; // Exactly 16 bytes for IV
const VERSION_HEADER = 'v:1,';

// Client-side encryption function
function encryptClient(dataObject) {
  const jsonString = JSON.stringify(dataObject);
  const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
  const iv = CryptoJS.enc.Utf8.parse(ENCRYPTION_IV);
  
  const encrypted = CryptoJS.AES.encrypt(jsonString, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  return VERSION_HEADER + encrypted.toString();
}

// Client-side decryption function
function decryptClient(envelope) {
  if (!envelope.startsWith(VERSION_HEADER)) {
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
  return JSON.parse(jsonString);
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

// Default building animation
const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: buildingAnimation,
    rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet'
    }
};

// Success animation (play once)
const successOptions = {
    loop: false,
    autoplay: true,
    animationData: successAnimation,
    rendererSettings: {
        preserveAspectRatio: 'xMidYMid slice'
    }
};

function OurCampus() {
    const location = useLocation();
    const navigate = useNavigate();
    const formData = location.state?.formData || {};

    const [campusData, setCampusData] = useState({
        eventName: '',
        eventDate: new Date(),
        name: '',
        mobileNumber: '',
        userType: '',
        staffId: '',
        selfieImage: null,
        feedback: '',
        signature: null,
    });

    const [errors, setErrors] = useState({});
    const [selfiePreview, setSelfiePreview] = useState(null);
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const sigCanvas = useRef({});
    const formRef = useRef(null);
    const signatureRef = useRef(null);
    const feedbackRef = useRef(null);

    useEffect(() => {
        if (formData.firstName || formData.lastName) {
            const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();
            setCampusData(prevData => ({
                ...prevData,
                name: fullName,
                mobileNumber: formData.contact || '',
                userType: formData.employeeType === 'KGISL' ? 'Staff' : 'Visitor',
                staffId: formData.employeeType === 'KGISL' ? (formData.employeeId || '') : ''
            }));
        }
    }, [formData]);

    useEffect(() => {
        const formElements = formRef.current.querySelectorAll('input, textarea, select');
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

    useEffect(() => {
        if (selfiePreview && feedbackRef.current) {
            feedbackRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }, [selfiePreview]);

    const handleDateChange = (date) => {
        setCampusData(prevData => ({
            ...prevData,
            eventDate: date
        }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCampusData(prevData => ({
            ...prevData,
            [name]: value,
            ...(name === 'userType' && value === 'Visitor' && { staffId: '' })
        }));
    };

    const handleSelfieChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('File size should be less than 5MB');
                return;
            }
            setCampusData(prevData => ({ ...prevData, selfieImage: file }));
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelfiePreview(reader.result);
            };
            reader.readAsDataURL(file);
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
            setCampusData(prevData => ({
                ...prevData,
                signature: sigCanvas.current.toDataURL(),
            }));
        }
    };

    const handleClearSignature = () => {
        sigCanvas.current.clear();
        setCampusData(prevData => ({
            ...prevData,
            signature: null,
        }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!campusData.eventName) newErrors.eventName = 'Event Name is required.';
        if (!campusData.name) newErrors.name = 'Name is required.';
        if (!campusData.eventDate) newErrors.eventDate = 'Event Date is required.';
        if (!campusData.mobileNumber) {
            newErrors.mobileNumber = 'Mobile number is required.';
        } else if (!/^\d{10}$/.test(campusData.mobileNumber)) {
            newErrors.mobileNumber = 'Mobile number must be 10 digits.';
        }
        if (!campusData.userType) newErrors.userType = 'Visitor/Staff status is required.';
        if (campusData.userType === 'Staff' && !campusData.staffId) {
            newErrors.staffId = 'Staff ID is required for staff members.';
        }
        if (!campusData.selfieImage) newErrors.selfieImage = 'A selfie is required.';
        if (!campusData.feedback) newErrors.feedback = 'Feedback is required.';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
 
        if (!validateForm() || !campusData.signature) {
            toast.error('Please complete the form and add your signature.');
            return;
        }
 
        setIsSubmitting(true);
 
        try {
            // Convert selfie to Base64
            const selfieBase64 = await fileToBase64(campusData.selfieImage);

            // Format date as DD/MM/YYYY
            const day = campusData.eventDate.getDate().toString().padStart(2, '0');
            const month = (campusData.eventDate.getMonth() + 1).toString().padStart(2, '0');
            const year = campusData.eventDate.getFullYear();
            const formattedDate = `${day}/${month}/${year}`;

            // Create payload object
            const payload = {
                // Domain landing form data
                firstName: formData.firstName || '',
                lastName: formData.lastName || '',
                gender: formData.gender || '',
                email: formData.email || '',
                contact: formData.contact || '',
                employeeId: formData.employeeId || '',
                employeeType: formData.employeeType || '',
                employeeStatus: formData.employeeStatus || '',
                // Campus form data
                eventName: campusData.eventName,
                visitDate: formattedDate,
                name: campusData.name,
                mobileNumber: campusData.mobileNumber,
                userType: campusData.userType,
                staffId: campusData.staffId || '',
                feedback: campusData.feedback,
                signature: campusData.signature,
                selfieImage: selfieBase64
            };

            // Encrypt the payload
            const envelope = encryptClient(payload);

            // Send encrypted request
            const response = await fetch(`${API_BASE_URL}/campus-form/add-info`, {
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
                result = decryptClient(encryptedResult.envelope);
            } catch (decryptError) {
                console.error('Decryption error:', decryptError);
                toast.error('Failed to decrypt server response');
                return;
            }
 
            if (response.ok) {
                toast.success(result.message || 'Feedback submitted successfully!');
                setShowSuccess(true);
 
                setTimeout(() => {
                    setShowSuccess(false);
                    navigate('/domain-landing', {
                        state: { formData }
                    });
                }, 2000);
            } else {
                toast.error(result.error || 'Error submitting feedback.');
            }
 
        } catch (error) {
            console.error('Submit error:', error);
            toast.error('Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBack = () => {
        navigate('/domain-landing', { state: { formData } });
    };

    return (
        <div className="campus-form-wrapper-alt">
            <Toaster position="top-center" />

            {showSuccess ? (
                <div className="success-lottie-container-alt">
                    <Lottie options={successOptions} height={200} width={200} />
                </div>
            ) : (
                <div className="campus-form-blur-container">
                    <div className="campus-form-lottie-container">
                        <Lottie options={defaultOptions} />
                    </div>
                    <div className="campus-form-content">
                        <div className="campus-form-header-alt">
                            <button className="campus-form-back-button-alt" onClick={handleBack}>
                                <FaChevronLeft />
                            </button>
                            <p className="campus-form-title-alt">Campus Feedback</p>
                        </div>

                        <form className="campus-form-grid-alt" noValidate ref={formRef}>
                            {/* Event Name */}
                            <div className="campus-form-group-alt">
                                <label htmlFor="eventName" className="campus-form-label-alt">
                                    <MdOutlineEventNote className="campus-label-icon" />
                                    Name of Event
                                </label>
                                <input
                                    type="text"
                                    id="eventName"
                                    name="eventName"
                                    value={campusData.eventName}
                                    onChange={handleChange}
                                    className="campus-form-input-alt"
                                    placeholder="Enter event name"
                                    disabled={isSubmitting}
                                />
                                {errors.eventName && <p className="campus-form-error-alt">{errors.eventName}</p>}
                            </div>

                            <div className="campus-form-group-alt">
                                <label htmlFor="eventDate" className="campus-form-label-alt">
                                    <MdOutlineDateRange className="campus-label-icon" />
                                    Event Date
                                </label>
                                <DatePicker
                                    id="eventDate"
                                    selected={campusData.eventDate}
                                    onChange={handleDateChange}
                                    maxDate={new Date()}
                                    minDate={new Date(new Date().setDate(new Date().getDate() - 6))}
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="Select event date"
                                    className="campus-form-input-alt"
                                    disabled={isSubmitting}
                                />
                                {errors.eventDate && <p className="campus-form-error-alt">{errors.eventDate}</p>}
                            </div>

                            {/* Name */}
                            <div className="campus-form-group-alt">
                                <label htmlFor="name" className="campus-form-label-alt">
                                    <MdOutlinePerson className="campus-label-icon" />
                                    Name
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={campusData.name}
                                    onChange={handleChange}
                                    className="campus-form-input-alt disabled"
                                    disabled
                                />
                            </div>

                            {/* Mobile Number */}
                            <div className="campus-form-group-alt">
                                <label htmlFor="mobileNumber" className="campus-form-label-alt">
                                    <MdOutlinePhone className="campus-label-icon" />
                                    Mobile Number
                                </label>
                                <input
                                    type="tel"
                                    id="mobileNumber"
                                    name="mobileNumber"
                                    value={campusData.mobileNumber}
                                    onChange={handleChange}
                                    className="campus-form-input-alt disabled"
                                    disabled
                                />
                            </div>

                            {/* User Type */}
                            <div className="campus-form-group-alt">
                                <label htmlFor="userType" className="campus-form-label-alt">
                                    <MdGroup className="campus-label-icon" />
                                    Visitor or Staff
                                </label>
                                <select
                                    id="userType"
                                    name="userType"
                                    value={campusData.userType}
                                    onChange={handleChange}
                                    className="campus-form-select-alt"
                                    disabled={isSubmitting}
                                >
                                    <option value="">Select Type</option>
                                    <option value="Visitor">Visitor</option>
                                    <option value="Staff">Staff</option>
                                </select>
                                {errors.userType && <p className="campus-form-error-alt">{errors.userType}</p>}
                            </div>

                            {/* Staff ID if Staff */}
                            {campusData.userType === 'Staff' && (
                                <div className="campus-form-group-alt">
                                    <label htmlFor="staffId" className="campus-form-label-alt">
                                        <MdOutlineBadge className="campus-label-icon" />
                                        Staff ID
                                    </label>
                                    <input
                                        type="text"
                                        id="staffId"
                                        name="staffId"
                                        value={campusData.staffId}
                                        onChange={handleChange}
                                        className="campus-form-input-alt"
                                        placeholder="Enter staff ID"
                                        disabled={isSubmitting}
                                    />
                                    {errors.staffId && <p className="campus-form-error-alt">{errors.staffId}</p>}
                                </div>
                            )}

                            {/* Selfie Upload */}
                            <div className="campus-form-group-alt selfie-group">
                                <label className="campus-form-label-alt">
                                    <MdOutlinePhotoCamera className="campus-label-icon" />
                                    Your Selfie Image
                                </label>
                                <input
                                    type="file"
                                    id="selfie"
                                    name="selfie"
                                    accept="image/*"
                                    onChange={handleSelfieChange}
                                    className="campus-form-input-alt"
                                    style={{ display: 'none' }}
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    className="selfie-button-alt"
                                    onClick={() => document.getElementById('selfie').click()}
                                    disabled={isSubmitting}
                                >
                                    <MdOutlinePhotoCamera className="selfie-icon-alt" />
                                    Upload Selfie
                                </button>
                                {selfiePreview && <img src={selfiePreview} alt="Selfie Preview" className="selfie-preview-alt" />}
                                {errors.selfieImage && <p className="campus-form-error-alt">{errors.selfieImage}</p>}
                            </div>

                            {/* Feedback with ref for auto-scroll */}
                            <div className="campus-form-group-alt" ref={feedbackRef}>
                                <label htmlFor="feedback" className="campus-form-label-alt">
                                    <TfiWrite className="campus-label-icon" />
                                    Your Feedback
                                </label>
                                <textarea
                                    id="feedback"
                                    name="feedback"
                                    value={campusData.feedback}
                                    onChange={handleChange}
                                    className="campus-form-textarea-alt"
                                    placeholder="Share your feedback about the campus event..."
                                    disabled={isSubmitting}
                                />
                                {errors.feedback && <p className="campus-form-error-alt">{errors.feedback}</p>}
                            </div>

                            {/* Signature Pad */}
                            {showSignaturePad ? (
                                <div className="campus-signature-container" ref={signatureRef}>
                                    <p className="campus-signature-heading">Please sign below:</p>
                                    <SignaturePad
                                        ref={sigCanvas}
                                        penColor='#3d2c20'
                                        canvasProps={{ width: 450, height: 200, className: 'campus-signature-canvas' }}
                                        onEnd={handleSignatureEnd}
                                    />
                                    <div className="campus-signature-buttons">
                                        <button
                                            type="button"
                                            className="clear-button-alt"
                                            onClick={handleClearSignature}
                                            disabled={isSubmitting}
                                        >
                                            Clear
                                        </button>
                                        <button
                                            type="button"
                                            className="campus-submit-button-alt"
                                            onClick={handleSubmit}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="campus-form-submit-button-alt"
                                    onClick={handleSignatureStart}
                                    disabled={isSubmitting}
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

export default OurCampus;