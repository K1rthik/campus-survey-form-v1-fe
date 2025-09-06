import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaChevronLeft } from 'react-icons/fa';
import { MdOutlineEventNote, MdOutlinePerson, MdOutlinePhone, MdGroup, MdOutlinePhotoCamera, MdOutlineBadge } from 'react-icons/md';
import { TfiWrite } from 'react-icons/tfi';
import Lottie from 'react-lottie';
import SignaturePad from 'react-signature-canvas';
import toast, { Toaster } from 'react-hot-toast';
import buildingAnimation from '../assets/Building.json';
import successAnimation from '../assets/success.json';
import '../styles/OurCampus.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

    // Refs for DOM elements to enable smooth scrolling
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

    // Effect to add smooth-scrolling behavior to all input, textarea, and select fields
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

    // Effect to scroll to feedback section when selfie is uploaded
    useEffect(() => {
        if (selfiePreview && feedbackRef.current) {
            feedbackRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }, [selfiePreview]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCampusData(prevData => ({
            ...prevData,
            [name]: value,
            ...(name === 'userType' && value === 'Visitor' && { staffId: '' })
        }));
    };

    // const handleSelfieChange = (e) => {
    //     const file = e.target.files[0];
    //     if (file) {
    //         if (file.size > 5 * 1024 * 1024) {
    //             toast.error('File size should be less than 5MB');
    //             return;
    //         }

    //         setCampusData(prevData => ({ ...prevData, selfieImage: file }));
    //         const reader = new FileReader();
    //         reader.onloadend = () => {
    //             setSelfiePreview(reader.result);
    //         };
    //         reader.readAsDataURL(file);
    //     }
    // };
    const handleSelfieChange = (e) => {
        const file = e.target.files[0];
        if (file) {
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
            // Delay the scroll to allow the component to render before scrolling
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
            const formDataToSend = new FormData();

            // Add ALL domain landing form data
            formDataToSend.append('firstName', formData.firstName || '');
            formDataToSend.append('lastName', formData.lastName || '');
            formDataToSend.append('gender', formData.gender || '');
            formDataToSend.append('email', formData.email || '');
            formDataToSend.append('contact', formData.contact || '');
            formDataToSend.append('employeeId', formData.employeeId || '');
            formDataToSend.append('employeeType', formData.employeeType || '');
            formDataToSend.append('employeeStatus', formData.employeeStatus || '');

            // Add campus form data
            formDataToSend.append('eventName', campusData.eventName);
            formDataToSend.append('name', campusData.name);
            formDataToSend.append('mobileNumber', campusData.mobileNumber);
            formDataToSend.append('userType', campusData.userType);
            formDataToSend.append('staffId', campusData.staffId || '');
            formDataToSend.append('feedback', campusData.feedback);
            
            if (campusData.selfieImage instanceof File) {
                formDataToSend.append('selfieImage', campusData.selfieImage);
            }
            formDataToSend.append('signature', campusData.signature);

            const response = await fetch(`${API_BASE_URL}/campus-form/add-info`, {
                method: 'POST',
                body: formDataToSend
            });

            const result = await response.json();

            if (response.ok) {
                toast.success('Feedback submitted successfully!');
                setShowSuccess(true);

                setTimeout(() => {
                    setShowSuccess(false);
                    navigate('/domain-landing', {
                        state: {
                            formData
                        }
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



// import React, { useState, useEffect, useRef } from 'react';
// import { useLocation, useNavigate } from 'react-router-dom';
// import { FaChevronLeft } from 'react-icons/fa';
// import { MdOutlineEventNote, MdOutlinePerson, MdOutlinePhone, MdGroup, MdOutlinePhotoCamera, MdOutlineBadge } from 'react-icons/md';
// import { TfiWrite } from 'react-icons/tfi';
// import Lottie from 'react-lottie';
// import SignaturePad from 'react-signature-canvas';
// import toast, { Toaster } from 'react-hot-toast';
// import buildingAnimation from '../assets/building.json';
// import successAnimation from '../assets/success.json'; // ✅ Import success animation
// import '../styles/OurCampus.css';

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// // Default building animation
// const defaultOptions = {
//     loop: true,
//     autoplay: true,
//     animationData: buildingAnimation,
//     rendererSettings: {
//         preserveAspectRatio: 'xMidYMid meet'
//     }
// };

// // Success animation (play once)
// const successOptions = {
//     loop: false,
//     autoplay: true,
//     animationData: successAnimation,
//     rendererSettings: {
//         preserveAspectRatio: 'xMidYMid slice'
//     }
// };

// function OurCampus() {
//     const location = useLocation();
//     const navigate = useNavigate();
//     const formData = location.state?.formData || {};

//     const [campusData, setCampusData] = useState({
//         eventName: '',
//         name: '',
//         mobileNumber: '',
//         userType: '',
//         staffId: '',
//         selfieImage: null,
//         feedback: '',
//         signature: null,
//     });

//     const [errors, setErrors] = useState({});
//     const [selfiePreview, setSelfiePreview] = useState(null);
//     const [showSignaturePad, setShowSignaturePad] = useState(false);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [showSuccess, setShowSuccess] = useState(false); // ✅ Success state
//     const sigCanvas = useRef({});

//     useEffect(() => {
//         if (formData.firstName || formData.lastName) {
//             const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();
//             setCampusData(prevData => ({
//                 ...prevData,
//                 name: fullName,
//                 mobileNumber: formData.contact || '',
//                 userType: formData.employeeType === 'KGISL' ? 'Staff' : 'Visitor',
//                 staffId: formData.employeeType === 'KGISL' ? (formData.employeeId || '') : ''
//             }));
//         }
//     }, [formData]);

//     const handleChange = (e) => {
//         const { name, value } = e.target;
//         setCampusData(prevData => ({
//             ...prevData,
//             [name]: value,
//             ...(name === 'userType' && value === 'Visitor' && { staffId: '' })
//         }));
//     };

//     const handleSelfieChange = (e) => {
//         const file = e.target.files[0];
//         if (file) {
//             if (file.size > 5 * 1024 * 1024) {
//                 toast.error('File size should be less than 5MB');
//                 return;
//             }

//             setCampusData(prevData => ({ ...prevData, selfieImage: file }));
//             const reader = new FileReader();
//             reader.onloadend = () => {
//                 setSelfiePreview(reader.result);
//             };
//             reader.readAsDataURL(file);
//         }
//     };

//     const handleSignatureStart = () => {
//         if (validateForm()) {
//             setShowSignaturePad(true);
//         }
//     };

//     const handleSignatureEnd = () => {
//         if (!sigCanvas.current.isEmpty()) {
//             setCampusData(prevData => ({
//                 ...prevData,
//                 signature: sigCanvas.current.toDataURL(),
//             }));
//         }
//     };

//     const handleClearSignature = () => {
//         sigCanvas.current.clear();
//         setCampusData(prevData => ({
//             ...prevData,
//             signature: null,
//         }));
//     };

//     const validateForm = () => {
//         const newErrors = {};
//         if (!campusData.eventName) newErrors.eventName = 'Event Name is required.';
//         if (!campusData.name) newErrors.name = 'Name is required.';
//         if (!campusData.mobileNumber) {
//             newErrors.mobileNumber = 'Mobile number is required.';
//         } else if (!/^\d{10}$/.test(campusData.mobileNumber)) {
//             newErrors.mobileNumber = 'Mobile number must be 10 digits.';
//         }
//         if (!campusData.userType) newErrors.userType = 'Visitor/Staff status is required.';
//         if (campusData.userType === 'Staff' && !campusData.staffId) {
//             newErrors.staffId = 'Staff ID is required for staff members.';
//         }
//         if (!campusData.selfieImage) newErrors.selfieImage = 'A selfie is required.';
//         if (!campusData.feedback) newErrors.feedback = 'Feedback is required.';

//         setErrors(newErrors);
//         return Object.keys(newErrors).length === 0;
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();

//         if (!validateForm() || !campusData.signature) {
//             toast.error('Please complete the form and add your signature.');
//             return;
//         }

//         setIsSubmitting(true);

//         try {
//             const formDataToSend = new FormData();

//             // Add ALL domain landing form data
//             formDataToSend.append('firstName', formData.firstName || '');
//             formDataToSend.append('lastName', formData.lastName || '');
//             formDataToSend.append('gender', formData.gender || '');
//             formDataToSend.append('email', formData.email || '');
//             formDataToSend.append('contact', formData.contact || '');
//             formDataToSend.append('employeeId', formData.employeeId || '');
//             formDataToSend.append('employeeType', formData.employeeType || '');

//             // Add campus form data
//             formDataToSend.append('eventName', campusData.eventName);
//             formDataToSend.append('name', campusData.name);
//             formDataToSend.append('mobileNumber', campusData.mobileNumber);
//             formDataToSend.append('userType', campusData.userType);
//             formDataToSend.append('staffId', campusData.staffId || '');
//             formDataToSend.append('feedback', campusData.feedback);
//             formDataToSend.append('selfieImage', campusData.selfieImage);
//             formDataToSend.append('signature', campusData.signature);

//             const response = await fetch(`${API_BASE_URL}/campus-form/add-info`, {
//                 method: 'POST',
//                 body: formDataToSend
//             });

//             const result = await response.json();

//             if (response.ok) {
//                 toast.success('Feedback submitted successfully!');
                
//                 // ✅ Show success animation
//                 setShowSuccess(true);

//                 setTimeout(() => {
//                     setShowSuccess(false);
//                     navigate('/');
//                 }, 2000);
//             } else {
//                 toast.error(result.error || 'Error submitting feedback.');
//             }

//         } catch (error) {
//             console.error('Submit error:', error);
//             toast.error('Network error. Please try again.');
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const handleBack = () => {
//         navigate('/domain-landing', { state: { formData } });
//     };

//     return (
//         <div className="campus-form-wrapper-alt">
//             <Toaster position="top-center" />
            
//             {showSuccess ? (
//                 <div className="success-lottie-container-alt">
//                     <Lottie options={successOptions} height={200} width={200} />
//                 </div>
//             ) : (
//                 <div className="campus-form-blur-container">
//                     <div className="campus-form-lottie-container">
//                         <Lottie options={defaultOptions} />
//                     </div>
//                     <div className="campus-form-content">
//                         <div className="campus-form-header-alt">
//                             <button className="campus-form-back-button-alt" onClick={handleBack}>
//                                 <FaChevronLeft />
//                             </button>
//                             <p className="campus-form-title-alt">Campus Feedback</p>
//                         </div>

//                         {/* --- FORM CONTENT (unchanged) --- */}
//                         <form className="campus-form-grid-alt" noValidate>
//                             {/* Event Name */}
//                             <div className="campus-form-group-alt">
//                                 <label htmlFor="eventName" className="campus-form-label-alt">
//                                     <MdOutlineEventNote className="campus-label-icon" />
//                                     Name of Event
//                                 </label>
//                                 <input
//                                     type="text"
//                                     id="eventName"
//                                     name="eventName"
//                                     value={campusData.eventName}
//                                     onChange={handleChange}
//                                     className="campus-form-input-alt"
//                                     placeholder="Enter event name"
//                                     disabled={isSubmitting}
//                                 />
//                                 {errors.eventName && <p className="campus-form-error-alt">{errors.eventName}</p>}
//                             </div>

//                             {/* Name */}
//                             <div className="campus-form-group-alt">
//                                 <label htmlFor="name" className="campus-form-label-alt">
//                                     <MdOutlinePerson className="campus-label-icon" />
//                                     Name
//                                 </label>
//                                 <input
//                                     type="text"
//                                     id="name"
//                                     name="name"
//                                     value={campusData.name}
//                                     onChange={handleChange}
//                                     className="campus-form-input-alt disabled"
//                                     disabled
//                                 />
//                             </div>

//                             {/* Mobile Number */}
//                             <div className="campus-form-group-alt">
//                                 <label htmlFor="mobileNumber" className="campus-form-label-alt">
//                                     <MdOutlinePhone className="campus-label-icon" />
//                                     Mobile Number
//                                 </label>
//                                 <input
//                                     type="tel"
//                                     id="mobileNumber"
//                                     name="mobileNumber"
//                                     value={campusData.mobileNumber}
//                                     onChange={handleChange}
//                                     className="campus-form-input-alt disabled"
//                                     disabled
//                                 />
//                             </div>

//                             {/* User Type */}
//                             <div className="campus-form-group-alt">
//                                 <label htmlFor="userType" className="campus-form-label-alt">
//                                     <MdGroup className="campus-label-icon" />
//                                     Visitor or Staff
//                                 </label>
//                                 <select
//                                     id="userType"
//                                     name="userType"
//                                     value={campusData.userType}
//                                     onChange={handleChange}
//                                     className="campus-form-select-alt"
//                                     disabled={isSubmitting}
//                                 >
//                                     <option value="">Select Type</option>
//                                     <option value="Visitor">Visitor</option>
//                                     <option value="Staff">Staff</option>
//                                 </select>
//                                 {errors.userType && <p className="campus-form-error-alt">{errors.userType}</p>}
//                             </div>

//                             {/* Staff ID if Staff */}
//                             {campusData.userType === 'Staff' && (
//                                 <div className="campus-form-group-alt">
//                                     <label htmlFor="staffId" className="campus-form-label-alt">
//                                         <MdOutlineBadge className="campus-label-icon" />
//                                         Staff ID
//                                     </label>
//                                     <input
//                                         type="text"
//                                         id="staffId"
//                                         name="staffId"
//                                         value={campusData.staffId}
//                                         onChange={handleChange}
//                                         className="campus-form-input-alt"
//                                         placeholder="Enter staff ID"
//                                         disabled={isSubmitting}
//                                     />
//                                     {errors.staffId && <p className="campus-form-error-alt">{errors.staffId}</p>}
//                                 </div>
//                             )}

//                             {/* Selfie Upload */}
//                             <div className="campus-form-group-alt selfie-group">
//                                 <label className="campus-form-label-alt">
//                                     <MdOutlinePhotoCamera className="campus-label-icon" />
//                                     Your Selfie Image
//                                 </label>
//                                 <input
//                                     type="file"
//                                     id="selfie"
//                                     name="selfie"
//                                     accept="image/*"
//                                     onChange={handleSelfieChange}
//                                     className="campus-form-input-alt"
//                                     style={{ display: 'none' }}
//                                     disabled={isSubmitting}
//                                 />
//                                 <button
//                                     type="button"
//                                     className="selfie-button-alt"
//                                     onClick={() => document.getElementById('selfie').click()}
//                                     disabled={isSubmitting}
//                                 >
//                                     <MdOutlinePhotoCamera className="selfie-icon-alt" />
//                                     Upload Selfie
//                                 </button>
//                                 {selfiePreview && <img src={selfiePreview} alt="Selfie Preview" className="selfie-preview-alt" />}
//                                 {errors.selfieImage && <p className="campus-form-error-alt">{errors.selfieImage}</p>}
//                             </div>

//                             {/* Feedback */}
//                             <div className="campus-form-group-alt">
//                                 <label htmlFor="feedback" className="campus-form-label-alt">
//                                     <TfiWrite className="campus-label-icon" />
//                                     Your Feedback
//                                 </label>
//                                 <textarea
//                                     id="feedback"
//                                     name="feedback"
//                                     value={campusData.feedback}
//                                     onChange={handleChange}
//                                     className="campus-form-textarea-alt"
//                                     placeholder="Share your feedback about the campus event..."
//                                     disabled={isSubmitting}
//                                 />
//                                 {errors.feedback && <p className="campus-form-error-alt">{errors.feedback}</p>}
//                             </div>

//                             {/* Signature Pad */}
//                             {showSignaturePad ? (
//                                 <div className="campus-signature-container">
//                                     <p className="campus-signature-heading">Please sign below:</p>
//                                     <SignaturePad
//                                         ref={sigCanvas}
//                                         penColor='rgb(48, 48, 48)'
//                                         canvasProps={{ width: 450, height: 200, className: 'campus-signature-canvas' }}
//                                         onEnd={handleSignatureEnd}
//                                     />
//                                     <div className="campus-signature-buttons">
//                                         <button
//                                             type="button"
//                                             className="clear-button-alt"
//                                             onClick={handleClearSignature}
//                                             disabled={isSubmitting}
//                                         >
//                                             Clear
//                                         </button>
//                                         <button
//                                             type="button"
//                                             className="campus-submit-button-alt"
//                                             onClick={handleSubmit}
//                                             disabled={isSubmitting}
//                                         >
//                                             {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
//                                         </button>
//                                     </div>
//                                 </div>
//                             ) : (
//                                 <button
//                                     type="button"
//                                     className="campus-form-submit-button-alt"
//                                     onClick={handleSignatureStart}
//                                     disabled={isSubmitting}
//                                 >
//                                     Signature
//                                 </button>
//                             )}
//                         </form>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }

// export default OurCampus;