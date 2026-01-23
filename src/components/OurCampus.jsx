import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaChevronLeft } from 'react-icons/fa';
import { MdOutlineEventNote, MdOutlinePerson, MdOutlinePhone, MdGroup, MdOutlinePhotoCamera, MdOutlineBadge, MdOutlineDateRange, MdOutlineCategory } from 'react-icons/md';
import { TfiWrite } from 'react-icons/tfi';
import Lottie from 'react-lottie';
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
        selectionType: '', // Campus feedback category selection
        eventName: '',
        eventDate: new Date(),
        name: '',
        mobileNumber: '',
        userType: '',
        staffId: '',
        selfieImage: null,
        feedback: '',
    });

    const [errors, setErrors] = useState({});
    const [selfiePreview, setSelfiePreview] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const formRef = useRef(null);
    const feedbackRef = useRef(null);

    useEffect(() => {
        if (formData.firstName || formData.lastName) {
            const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();
            setCampusData(prevData => ({
                ...prevData,
                name: fullName,
                mobileNumber: formData.contact || '',
                // Set userType based on employeeStatus: "Visitors" -> "Visitor", otherwise check employeeType
                userType: formData.employeeStatus === 'Visitors' ? 'Visitor' : 
                         (formData.employeeType === 'KGISL' ? 'Staff' : 'Visitor'),
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

        // Clear eventName when selection type changes
        if (name === 'selectionType') {
            setCampusData(prevData => ({ ...prevData, eventName: '' }));
        }
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

    // Dynamic label and placeholder based on selection type and employee status
    const getEventFieldLabel = () => {
        // If Visitors, always show "Purpose of visit"
        if (formData.employeeStatus === 'Visitors') {
            return 'Purpose of visit';
        }
        
        // For campus feedback categories, show appropriate event field label
        if (campusData.selectionType === 'others-suggestions') {
            return 'Topic/Subject';
        }
        
        // For all other campus categories, show generic event/activity name
        return 'Event/Activity Name';
    };

    const getEventFieldPlaceholder = () => {
        // If Visitors, always show purpose placeholder
        if (formData.employeeStatus === 'Visitors') {
            return 'Enter purpose of visit';
        }
        
        // For campus feedback categories, show appropriate placeholder
        if (campusData.selectionType === 'others-suggestions') {
            return 'Enter topic or subject';
        }
        
        // For all other campus categories
        return 'Enter event or activity name';
    };

    const getDateFieldLabel = () => {
        // If Visitors, show "Date of visit"
        if (formData.employeeStatus === 'Visitors' ||formData.employeeStatus === 'Employee') {
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
        
        if (!campusData.selectionType) newErrors.selectionType = 'Feedback category is required.';
        if (!campusData.eventName) {
            let fieldName;
            if (formData.employeeStatus === 'Visitors') {
                fieldName = 'Purpose of visit';
            } else if (campusData.selectionType === 'others-suggestions') {
                fieldName = 'Topic/Subject';
            } else {
                fieldName = 'Event/Activity Name';
            }
            newErrors.eventName = `${fieldName} is required.`;
        }
        if (!campusData.name) newErrors.name = 'Name is required.';
        if (!campusData.eventDate) {
            const dateFieldName = formData.employeeStatus === 'Visitors' ? 'Date of visit' : 'Event Date';
            newErrors.eventDate = `${dateFieldName} is required.`;
        }
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
 
        if (!validateForm()) {
            toast.error('Please complete all required fields.');
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

            // Create payload object (without signature)
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
                selectionType: campusData.selectionType,
                eventName: campusData.eventName,
                visitDate: formattedDate,
                name: campusData.name,
                mobileNumber: campusData.mobileNumber,
                userType: campusData.userType,
                staffId: campusData.staffId || '',
                feedback: campusData.feedback,
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
                            <p className="campus-form-title-alt">Our Campus </p>
                        </div>

                        <form className="campus-form-grid-alt" onSubmit={handleSubmit} noValidate ref={formRef} style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
                            {/* Campus Feedback Category Dropdown */}
                            <div className="campus-form-group-alt" style={{ width: '100%', maxWidth: '100%' }}>
                                <label htmlFor="selectionType" className="campus-form-label-alt">
                                    <MdOutlineCategory className="campus-label-icon" />
                                    Feedback Category
                                </label>
                                <select
                                    id="selectionType"
                                    name="selectionType"
                                    value={campusData.selectionType}
                                    onChange={handleChange}
                                    className="campus-form-select-alt"
                                    style={{ 
                                        width: '100%', 
                                        maxWidth: '100%', 
                                        boxSizing: 'border-box',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}
                                    disabled={isSubmitting}
                                >
                                    <option value="">Select Category</option>
                                    <option value="infrastructure">Infrastructure</option>
                                    <option value="cleanliness">Cleanliness</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="security">Security</option>
                                    <option value="cafeteria">Cafeteria</option>
                                    <option value="hostel">Hostel</option>
                                    <option value="it-wifi">IT / Wi-Fi</option>
                                    <option value="transport-parking">Transport & Parking</option>
                                    <option value="amenities">Amenities</option>
                                    <option value="administration-helpdesk">Administration / Helpdesk</option>
                                    <option value="safety">Safety</option>
                                    <option value="others-suggestions">Others / Suggestions</option>
                                </select>
                                {errors.selectionType && <p className="campus-form-error-alt">{errors.selectionType}</p>}
                            </div>

                            {/* Dynamic Event/Topic Name Field */}
                            <div className="campus-form-group-alt">
                                <label htmlFor="eventName" className="campus-form-label-alt">
                                    <MdOutlineEventNote className="campus-label-icon" />
                                    {getEventFieldLabel()}
                                </label>
                                <input
                                    type="text"
                                    id="eventName"
                                    name="eventName"
                                    value={campusData.eventName}
                                    onChange={handleChange}
                                    className="campus-form-input-alt"
                                    placeholder={getEventFieldPlaceholder()}
                                    disabled={isSubmitting}
                                />
                                {errors.eventName && <p className="campus-form-error-alt">{errors.eventName}</p>}
                            </div>

                            <div className="campus-form-group-alt">
                                <label htmlFor="eventDate" className="campus-form-label-alt">
                                    <MdOutlineDateRange className="campus-label-icon" />
                                    {getDateFieldLabel()}
                                </label>
                                <DatePicker
                                    id="eventDate"
                                    selected={campusData.eventDate}
                                    onChange={handleDateChange}
                                    maxDate={new Date()}
                                    minDate={new Date(new Date().setDate(new Date().getDate() - 6))}
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText={getDateFieldPlaceholder()}
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
                                    Upload Image
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
                                    Upload Image
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

                            {/* Direct Submit Button */}
                            <button
                                type="submit"
                                className="campus-form-submit-button-alt"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Posting...' : 'Post Feedback'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OurCampus;