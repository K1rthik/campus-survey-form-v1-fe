import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaChevronLeft } from 'react-icons/fa';
import { MdOutlinePerson, MdOutlinePhone, MdOutlineBadge, MdOutlineVerifiedUser, MdOutlineReportProblem, MdOutlinePhotoCamera, MdOutlineDateRange, MdOutlineEventNote, MdOutlineCategory } from 'react-icons/md';
import Lottie from 'react-lottie';
import toast, { Toaster } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import CryptoJS from 'crypto-js';
import "react-datepicker/dist/react-datepicker.css";
import protectedAnimation from '../assets/Security.json';
import successAnimation from '../assets/success.json';
import '../styles/Security.css';

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

// Default animation options
const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: protectedAnimation,
    rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet'
    }
};

// Success animation options (play once)
const successOptions = {
    loop: false,
    autoplay: true,
    animationData: successAnimation,
    rendererSettings: {
        preserveAspectRatio: 'xMidYMid slice'
    }
};

function Security() {
    const location = useLocation();
    const navigate = useNavigate();
    const formData = location.state?.formData || {};

    const [securityData, setSecurityData] = useState({
        selectionType: 'event', // Incident category selection
        eventName: '',
        eventDate: new Date(),
        name: '',
        mobileNumber: '',
        staffId: '',
        verification: '',
        incidentReport: '',
        images: [],
    });

    const [errors, setErrors] = useState({});
    const [imagePreviews, setImagePreviews] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const formRef = useRef(null);
    const imageRef = useRef(null);

    useEffect(() => {
        if (formData.firstName || formData.lastName) {
            const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();
            setSecurityData(prevData => ({
                ...prevData,
                name: fullName,
                mobileNumber: formData.contact || '',
                staffId: formData.employeeId || ''
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
        if (imagePreviews.length > 0 && imageRef.current) {
            imageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [imagePreviews]);

    const handleDateChange = (date) => {
        setSecurityData(prevData => ({
            ...prevData,
            eventDate: date
        }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSecurityData(prevData => ({ ...prevData, [name]: value }));

        // Clear eventName when selection type changes
        if (name === 'selectionType') {
            setSecurityData(prevData => ({ ...prevData, eventName: '' }));
        }
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length) {
            if (securityData.images.length + files.length > 10) {
                toast.error('Maximum 10 images allowed');
                return;
            }
            const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
            if (oversizedFiles.length > 0) {
                toast.error('Each file should be less than 5MB');
                return;
            }
            setSecurityData(prevData => ({
                ...prevData,
                images: [...prevData.images, ...files]
            }));
            const newPreviews = files.map(file => {
                const reader = new FileReader();
                return new Promise(resolve => {
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                });
            });
            Promise.all(newPreviews).then(previews => {
                setImagePreviews(prev => [...prev, ...previews]);
            });
        }
    };

    const removeImage = (index) => {
        setSecurityData(prevData => ({
            ...prevData,
            images: prevData.images.filter((_, i) => i !== index)
        }));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    // Dynamic label and placeholder based on selection type
    const getEventFieldLabel = () => {
        switch (securityData.selectionType) {
            case 'event':
                return 'Name of Event';
            case 'students':
                return 'Student Activity';
            case 'employees':
                return 'Employee Matter';
            case 'campus':
                return 'Campus Issue';
            case 'others':
                return 'Others Name';
            default:
                return 'Name of Event';
        }
    };

    const getEventFieldPlaceholder = () => {
        switch (securityData.selectionType) {
            case 'event':
                return 'Enter event name';
            case 'students':
                return 'Enter student activity';
            case 'employees':
                return 'Enter employee matter';
            case 'campus':
                return 'Enter campus issue';
            case 'others':
                return 'Enter others name';
            default:
                return 'Enter event name';
        }
    };

    const getDateFieldLabel = () => {
        return 'Date of incident';
    };

    const getDateFieldPlaceholder = () => {
        return 'Select event date';
    };

    // Dynamic dropdown options - simplified
    const getSelectionOptions = () => {
        return (
            <>
                <option value="event">Event</option>
                <option value="students">Students</option>
                <option value="employees">Employees</option>
                <option value="campus">Campus</option>
                <option value="others">Others / Suggestions</option>
            </>
        );
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!securityData.selectionType) newErrors.selectionType = 'Selection type is required.';
        if (!securityData.eventName) {
            let fieldName;
            switch (securityData.selectionType) {
                case 'event':
                    fieldName = 'Event Name';
                    break;
                case 'students':
                    fieldName = 'Student Activity';
                    break;
                case 'employees':
                    fieldName = 'Employee Matter';
                    break;
                case 'campus':
                    fieldName = 'Campus Issue';
                    break;
                case 'others':
                    fieldName = 'Others Name';
                    break;
                default:
                    fieldName = 'Event Name';
            }
            newErrors.eventName = `${fieldName} is required.`;
        }
        if (!securityData.eventDate) {
            newErrors.eventDate = 'Event Date is required.';
        }
        if (!securityData.name) newErrors.name = 'Name is required.';
        if (!securityData.mobileNumber) {
            newErrors.mobileNumber = 'Mobile number is required.';
        } else if (!/^\d{10}$/.test(securityData.mobileNumber)) {
            newErrors.mobileNumber = 'Mobile number must be 10 digits.';
        }
        if (!securityData.staffId) newErrors.staffId = 'Staff ID is required.';
        if (!securityData.verification) newErrors.verification = 'Verification is required.';
        if (!securityData.incidentReport) newErrors.incidentReport = 'Incident report is required.';
        if (securityData.images.length === 0) newErrors.images = 'At least one incident image is required.';
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
            // Convert images to Base64
            const imagesBase64 = await Promise.all(
                securityData.images.map(file => fileToBase64(file))
            );

            // Format date as DD/MM/YYYY
            const day = securityData.eventDate.getDate().toString().padStart(2, '0');
            const month = (securityData.eventDate.getMonth() + 1).toString().padStart(2, '0');
            const year = securityData.eventDate.getFullYear();
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
                // Security form data
                selectionType: securityData.selectionType,
                eventName: securityData.eventName,
                eventDate: formattedDate,
                name: securityData.name,
                mobileNumber: securityData.mobileNumber,
                staffId: securityData.staffId,
                verification: securityData.verification,
                incidentReport: securityData.incidentReport,
                images: imagesBase64
            };

            // Encrypt the payload
            const envelope = encryptClient(payload);

            // Send encrypted request
            const response = await fetch(`${API_BASE_URL}/security-form/add-info`, {
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
                toast.success(result.message || 'Security report submitted successfully!');
                setShowSuccess(true);
                setSecurityData({
                    selectionType: 'event', // Reset with default
                    eventName: '',
                    eventDate: new Date(),
                    name: '',
                    mobileNumber: '',
                    staffId: '',
                    verification: '',
                    incidentReport: '',
                    images: [],
                });
                setImagePreviews([]);
 
                setTimeout(() => {
                    setShowSuccess(false);
                    navigate('/domain-landing', {
                        state: { formData }
                    });
                }, 2000);
            } else {
                toast.error(result.error || 'Error submitting security report.');
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
        <div className="security-form-wrapper-alt">
            <Toaster position="top-center" />

            {showSuccess ? (
                <div className="success-lottie-container-alt">
                    <Lottie options={successOptions} height={200} width={200} />
                </div>
            ) : (
                <div className="security-form-blur-container">
                    <div className="security-form-lottie-container">
                        <Lottie options={defaultOptions} />
                    </div>
                    <div className="security-form-content">
                        <div className="security-form-header-alt">
                            <button className="security-form-back-button-alt" onClick={handleBack}>
                                <FaChevronLeft />
                            </button>
                            <p className="security-form-title-alt">Security Incident Report</p>
                        </div>

                        <form className="security-form-grid-alt" onSubmit={handleSubmit} noValidate ref={formRef} style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
                            {/* Incident Category Dropdown */}
                            <div className="security-form-group-alt" style={{ width: '100%', maxWidth: '100%' }}>
                                <label htmlFor="selectionType" className="security-form-label-alt">
                                    <MdOutlineCategory className="security-label-icon" />
                                    Incident category
                                </label>
                                <select
                                    id="selectionType"
                                    name="selectionType"
                                    value={securityData.selectionType}
                                    onChange={handleChange}
                                    className="security-form-select-alt"
                                    style={{ 
                                        width: '100%', 
                                        maxWidth: '100%', 
                                        boxSizing: 'border-box',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}
                                    disabled={isSubmitting}
                                >
                                    {getSelectionOptions()}
                                </select>
                                {errors.selectionType && <p className="security-form-error-alt">{errors.selectionType}</p>}
                            </div>

                            {/* Dynamic Event Name Field */}
                            <div className="security-form-group-alt">
                                <label htmlFor="eventName" className="security-form-label-alt">
                                    <MdOutlineEventNote className="security-label-icon" />
                                    {getEventFieldLabel()}
                                </label>
                                <input
                                    type="text"
                                    id="eventName"
                                    name="eventName"
                                    value={securityData.eventName}
                                    onChange={handleChange}
                                    className="security-form-input-alt"
                                    placeholder={getEventFieldPlaceholder()}
                                    disabled={isSubmitting}
                                />
                                {errors.eventName && <p className="security-form-error-alt">{errors.eventName}</p>}
                            </div>

                            <div className="security-form-group-alt">
                                <label htmlFor="eventDate" className="security-form-label-alt">
                                    <MdOutlineDateRange className="security-label-icon" />
                                    {getDateFieldLabel()}
                                </label>
                                <DatePicker
                                    id="eventDate"
                                    selected={securityData.eventDate}
                                    onChange={handleDateChange}
                                    maxDate={new Date()}
                                    minDate={new Date(new Date().setDate(new Date().getDate() - 6))}
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText={getDateFieldPlaceholder()}
                                    className="security-form-input-alt"
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="security-form-group-alt">
                                <label htmlFor="name" className="security-form-label-alt">
                                    <MdOutlinePerson className="security-label-icon" />
                                    Name
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={securityData.name}
                                    onChange={handleChange}
                                    className="security-form-input-alt disabled"
                                    disabled
                                />
                                {errors.name && <p className="security-form-error-alt">{errors.name}</p>}
                            </div>

                            <div className="security-form-group-alt">
                                <label htmlFor="mobileNumber" className="security-form-label-alt">
                                    <MdOutlinePhone className="security-label-icon" />
                                    Mobile Number
                                </label>
                                <input
                                    type="tel"
                                    id="mobileNumber"
                                    name="mobileNumber"
                                    value={securityData.mobileNumber}
                                    onChange={handleChange}
                                    className="security-form-input-alt disabled"
                                    disabled
                                />
                                {errors.mobileNumber && <p className="security-form-error-alt">{errors.mobileNumber}</p>}
                            </div>

                            <div className="security-form-group-alt">
                                <label htmlFor="staffId" className="security-form-label-alt">
                                    <MdOutlineBadge className="security-label-icon" />
                                    Staff ID
                                </label>
                                <input
                                    type="text"
                                    id="staffId"
                                    name="staffId"
                                    value={securityData.staffId}
                                    onChange={handleChange}
                                    className="security-form-input-alt"
                                    placeholder="Enter staff ID"
                                />
                                {errors.staffId && <p className="security-form-error-alt">{errors.staffId}</p>}
                            </div>

                            <div className="security-form-group-alt">
                                <label htmlFor="verification" className="security-form-label-alt">
                                    <MdOutlineVerifiedUser className="security-label-icon" />
                                    Verification
                                </label>
                                <textarea
                                    id="verification"
                                    name="verification"
                                    value={securityData.verification}
                                    onChange={handleChange}
                                    className="security-form-textarea-alt"
                                    placeholder="Enter verification details"
                                    rows="3"
                                    disabled={isSubmitting}
                                />
                                {errors.verification && <p className="security-form-error-alt">{errors.verification}</p>}
                            </div>

                            <div className="security-form-group-alt">
                                <label htmlFor="incidentReport" className="security-form-label-alt">
                                    <MdOutlineReportProblem className="security-label-icon" />
                                    Incident Reporting
                                </label>
                                <textarea
                                    id="incidentReport"
                                    name="incidentReport"
                                    value={securityData.incidentReport}
                                    onChange={handleChange}
                                    className="security-form-textarea-alt"
                                    placeholder="Describe the incident"
                                    rows="4"
                                    disabled={isSubmitting}
                                />
                                {errors.incidentReport && <p className="security-form-error-alt">{errors.incidentReport}</p>}
                            </div>

                            <div className="security-form-group-alt image-group" ref={imageRef}>
                                <label className="security-form-label-alt">
                                    <MdOutlinePhotoCamera className="security-label-icon" />
                                    Attach Images ({securityData.images.length}/10)
                                </label>
                                <input
                                    type="file"
                                    id="images"
                                    name="images"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageUpload}
                                    className="security-form-input-alt"
                                    style={{ display: 'none' }}
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    className="image-button-alt"
                                    onClick={() => document.getElementById('images').click()}
                                    disabled={isSubmitting || securityData.images.length >= 10}
                                >
                                    <MdOutlinePhotoCamera className="image-icon-alt" />
                                    Add Images
                                </button>
                                <div className="image-previews-alt">
                                    {imagePreviews.map((src, idx) => (
                                        <div key={idx} className="image-preview-container">
                                            <img src={src} alt={`Preview ${idx + 1}`} className="image-preview-alt" />
                                            <button
                                                type="button"
                                                className="remove-image-btn"
                                                onClick={() => removeImage(idx)}
                                                disabled={isSubmitting}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {errors.images && <p className="security-form-error-alt">{errors.images}</p>}
                            </div>

                            {/* Direct Submit Button */}
                            <button
                                type="submit"
                                className="security-form-submit-button-alt"
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

export default Security;