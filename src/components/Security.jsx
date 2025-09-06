import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaChevronLeft } from 'react-icons/fa';
import { MdOutlinePerson, MdOutlinePhone, MdOutlineBadge, MdOutlineVerifiedUser, MdOutlineReportProblem, MdOutlinePhotoCamera } from 'react-icons/md';
import Lottie from 'react-lottie';
import SignaturePad from 'react-signature-canvas';
import toast, { Toaster } from 'react-hot-toast';
import protectedAnimation from '../assets/Security.json';
import successAnimation from '../assets/success.json';
import '../styles/Security.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
        employeeName: '',
        name: '',
        mobileNumber: '',
        staffId: '',
        verification: '',
        incidentReport: '',
        images: [],
        signature: null,
    });

    const [errors, setErrors] = useState({});
    const [imagePreviews, setImagePreviews] = useState([]);
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Refs for DOM elements to enable smooth scrolling
    const sigCanvas = useRef({});
    const formRef = useRef(null);
    const imageRef = useRef(null);
    const signatureRef = useRef(null);

    // Effect to pre-populate form fields from location state
    useEffect(() => {
        if (formData.firstName || formData.lastName) {
            const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();
            setSecurityData(prevData => ({
                ...prevData,
                employeeName: fullName,
                name: fullName,
                mobileNumber: formData.contact || '',
                staffId: formData.employeeId || ''
            }));
        }
    }, [formData]);

    // Effect to add smooth-scrolling behavior to all input and textarea fields
    useEffect(() => {
        const formElements = formRef.current.querySelectorAll('input, textarea');
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

    // Effect to scroll to the image section when a new preview is added
    useEffect(() => {
        if (imagePreviews.length > 0 && imageRef.current) {
            imageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [imagePreviews]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSecurityData(prevData => ({ ...prevData, [name]: value }));
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
            setSecurityData(prevData => ({
                ...prevData,
                signature: sigCanvas.current.toDataURL(),
            }));
        }
    };

    const handleClearSignature = () => {
        sigCanvas.current.clear();
        setSecurityData(prevData => ({
            ...prevData,
            signature: null,
        }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!securityData.employeeName) newErrors.employeeName = 'Employee Name is required.';
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

        if (!validateForm() || !securityData.signature) {
            toast.error('Please complete the form and add your signature.');
            return;
        }

        setIsSubmitting(true);

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('firstName', formData.firstName || '');
            formDataToSend.append('lastName', formData.lastName || '');
            formDataToSend.append('gender', formData.gender || '');
            formDataToSend.append('email', formData.email || '');
            formDataToSend.append('contact', formData.contact || '');
            formDataToSend.append('employeeId', formData.employeeId || '');
            formDataToSend.append('employeeType', formData.employeeType || '');
            formDataToSend.append('employeeStatus', formData.employeeStatus || '');

            formDataToSend.append('employeeName', securityData.employeeName);
            formDataToSend.append('name', securityData.name);
            formDataToSend.append('mobileNumber', securityData.mobileNumber);
            formDataToSend.append('staffId', securityData.staffId);
            formDataToSend.append('verification', securityData.verification);
            formDataToSend.append('incidentReport', securityData.incidentReport);
            formDataToSend.append('signature', securityData.signature);

            securityData.images.forEach((image) => {
                formDataToSend.append('images', image);
            });

            const response = await fetch(`${API_BASE_URL}/security-form/add-info`, {
                method: 'POST',
                body: formDataToSend
            });

            const result = await response.json();

            if (response.ok) {
                toast.success('Feedback submitted successfully!');
                setShowSuccess(true);
                setSecurityData({
                    employeeName: '',
                    name: '',
                    mobileNumber: '',
                    staffId: '',
                    verification: '',
                    incidentReport: '',
                    images: [],
                    signature: null,
                });
                setImagePreviews([]);
                setShowSignaturePad(false);

                setTimeout(() => {
                    setShowSuccess(false);
                    navigate('/domain-landing', {
                        state: {
                            formData
                        }
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

                        <form className="security-form-grid-alt" noValidate ref={formRef}>
                            <div className="security-form-group-alt">
                                <label htmlFor="employeeName" className="security-form-label-alt">
                                    <MdOutlinePerson className="security-label-icon" />
                                    Name of Employee
                                </label>
                                <input
                                    type="text"
                                    id="employeeName"
                                    name="employeeName"
                                    value={securityData.employeeName}
                                    onChange={handleChange}
                                    className="security-form-input-alt disabled"
                                />
                                {errors.employeeName && <p className="security-form-error-alt">{errors.employeeName}</p>}
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

                            {showSignaturePad ? (
                                <div className="security-signature-container" ref={signatureRef}>
                                    <p className="security-signature-heading">Please sign below:</p>
                                    <SignaturePad
                                        ref={sigCanvas}
                                        penColor='#3d2c20'
                                        canvasProps={{ width: 450, height: 200, className: 'security-signature-canvas' }}
                                        onEnd={handleSignatureEnd}
                                    />
                                    <div className="security-signature-buttons">
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
                                            className="security-submit-button-alt"
                                            onClick={handleSubmit}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? 'Submitting...' : 'Submit Report'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="security-form-submit-button-alt"
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

export default Security;

// import React, { useState, useEffect, useRef } from 'react';
// import { useLocation, useNavigate } from 'react-router-dom';
// import { FaChevronLeft } from 'react-icons/fa';
// import { MdOutlinePerson, MdOutlinePhone, MdOutlineBadge, MdOutlineVerifiedUser, MdOutlineReportProblem, MdOutlinePhotoCamera } from 'react-icons/md';
// import Lottie from 'react-lottie';
// import SignaturePad from 'react-signature-canvas';
// import toast, { Toaster } from 'react-hot-toast';
// import protectedAnimation from '../assets/Password_Authentication.json';
// import successAnimation from '../assets/success.json'; 
// import '../styles/Security.css';

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// // Default animation
// const defaultOptions = {
//     loop: true,
//     autoplay: true,
//     animationData: protectedAnimation,
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

// function Security() {
//     const location = useLocation();
//     const navigate = useNavigate();
//     const formData = location.state?.formData || {};

//     const [securityData, setSecurityData] = useState({
//         employeeName: '',
//         name: '',
//         mobileNumber: '',
//         staffId: '',
//         verification: '',
//         incidentReport: '',
//         images: [],
//         signature: null,
//     });

//     const [errors, setErrors] = useState({});
//     const [imagePreviews, setImagePreviews] = useState([]);
//     const [showSignaturePad, setShowSignaturePad] = useState(false);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [showSuccess, setShowSuccess] = useState(false); // ✅ success state
//     const sigCanvas = useRef({});

//     useEffect(() => {
//         if (formData.firstName || formData.lastName) {
//             const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();
//             setSecurityData(prevData => ({
//                 ...prevData,
//                 employeeName: fullName,
//                 name: fullName,
//                 mobileNumber: formData.contact || '',
//                 staffId: formData.employeeId || ''
//             }));
//         }
//     }, [formData]);

//     const handleChange = (e) => {
//         const { name, value } = e.target;
//         setSecurityData(prevData => ({ ...prevData, [name]: value }));
//     };

//     const handleImageUpload = (e) => {
//         const files = Array.from(e.target.files);
//         if (files.length) {
//             if (securityData.images.length + files.length > 10) {
//                 toast.error('Maximum 10 images allowed');
//                 return;
//             }
//             const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
//             if (oversizedFiles.length > 0) {
//                 toast.error('Each file should be less than 5MB');
//                 return;
//             }
//             setSecurityData(prevData => ({
//                 ...prevData,
//                 images: [...prevData.images, ...files]
//             }));
//             const newPreviews = files.map(file => {
//                 const reader = new FileReader();
//                 return new Promise(resolve => {
//                     reader.onloadend = () => resolve(reader.result);
//                     reader.readAsDataURL(file);
//                 });
//             });
//             Promise.all(newPreviews).then(previews => {
//                 setImagePreviews(prev => [...prev, ...previews]);
//             });
//         }
//     };

//     const removeImage = (index) => {
//         setSecurityData(prevData => ({
//             ...prevData,
//             images: prevData.images.filter((_, i) => i !== index)
//         }));
//         setImagePreviews(prev => prev.filter((_, i) => i !== index));
//     };

//     const handleSignatureStart = () => {
//         if (validateForm()) {
//             setShowSignaturePad(true);
//         }
//     };

//     const handleSignatureEnd = () => {
//         if (!sigCanvas.current.isEmpty()) {
//             setSecurityData(prevData => ({
//                 ...prevData,
//                 signature: sigCanvas.current.toDataURL(),
//             }));
//         }
//     };

//     const handleClearSignature = () => {
//         sigCanvas.current.clear();
//         setSecurityData(prevData => ({
//             ...prevData,
//             signature: null,
//         }));
//     };

//     const validateForm = () => {
//         const newErrors = {};
//         if (!securityData.employeeName) newErrors.employeeName = 'Employee Name is required.';
//         if (!securityData.name) newErrors.name = 'Name is required.';
//         if (!securityData.mobileNumber) {
//             newErrors.mobileNumber = 'Mobile number is required.';
//         } else if (!/^\d{10}$/.test(securityData.mobileNumber)) {
//             newErrors.mobileNumber = 'Mobile number must be 10 digits.';
//         }
//         if (!securityData.staffId) newErrors.staffId = 'Staff ID is required.';
//         if (!securityData.verification) newErrors.verification = 'Verification is required.';
//         if (!securityData.incidentReport) newErrors.incidentReport = 'Incident report is required.';
//         if (securityData.images.length === 0) newErrors.images = 'At least one incident image is required.';
//         setErrors(newErrors);
//         return Object.keys(newErrors).length === 0;
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();

//         if (!validateForm() || !securityData.signature) {
//             toast.error('Please complete the form and add your signature.');
//             return;
//         }

//         setIsSubmitting(true);

//         try {
//             const formDataToSend = new FormData();
//             formDataToSend.append('firstName', formData.firstName || '');
//             formDataToSend.append('lastName', formData.lastName || '');
//             formDataToSend.append('gender', formData.gender || '');
//             formDataToSend.append('email', formData.email || '');
//             formDataToSend.append('contact', formData.contact || '');
//             formDataToSend.append('employeeId', formData.employeeId || '');
//             formDataToSend.append('employeeType', formData.employeeType || '');

//             formDataToSend.append('employeeName', securityData.employeeName);
//             formDataToSend.append('name', securityData.name);
//             formDataToSend.append('mobileNumber', securityData.mobileNumber);
//             formDataToSend.append('staffId', securityData.staffId);
//             formDataToSend.append('verification', securityData.verification);
//             formDataToSend.append('incidentReport', securityData.incidentReport);
//             formDataToSend.append('signature', securityData.signature);

//             securityData.images.forEach((image) => {
//                 formDataToSend.append('images', image);
//             });

//             const response = await fetch(`${API_BASE_URL}/security-form/add-info`, {
//                 method: 'POST',
//                 body: formDataToSend
//             });

//             const result = await response.json();

//             if (response.ok) {
//                 toast.success('Feedback submitted successfully!');
                
//                 // ✅ Show success animation
//                 setShowSuccess(true);

//                 // Reset form data
//                 setSecurityData({
//                     employeeName: '',
//                     name: '',
//                     mobileNumber: '',
//                     staffId: '',
//                     verification: '',
//                     incidentReport: '',
//                     images: [],
//                     signature: null,
//                 });
//                 setImagePreviews([]);
//                 setShowSignaturePad(false);

//                 setTimeout(() => {
//                     setShowSuccess(false);
//                     navigate('/');
//                 }, 2000);
//             } else {
//                 toast.error(result.error || 'Error submitting security report.');
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
//         <div className="security-form-wrapper-alt">
//             <Toaster position="top-center" />

//             {showSuccess ? (
//                 <div className="success-lottie-container-alt">
//                     <Lottie options={successOptions} height={200} width={200} />
//                 </div>
//             ) : (
//                 <div className="security-form-blur-container">
//                     <div className="security-form-lottie-container">
//                         <Lottie options={defaultOptions} />
//                     </div>
//                     <div className="security-form-content">
//                         <div className="security-form-header-alt">
//                             <button className="security-form-back-button-alt" onClick={handleBack}>
//                                 <FaChevronLeft />
//                             </button>
//                             <p className="security-form-title-alt">Security Incident Report</p>
//                         </div>

//                         {/* --- FORM CONTENT UNCHANGED --- */}
//                         <form className="security-form-grid-alt" noValidate>
//                         <div className="security-form-group-alt">
//                             <label htmlFor="employeeName" className="security-form-label-alt">
//                                 <MdOutlinePerson className="security-label-icon" />
//                                 Name of Employee
//                             </label>
//                             <input
//                                 type="text"
//                                 id="employeeName"
//                                 name="employeeName"
//                                 value={securityData.employeeName}
//                                 onChange={handleChange}
//                                 className="security-form-input-alt disabled"
                                
//                             />
//                             {errors.employeeName && <p className="security-form-error-alt">{errors.employeeName}</p>}
//                         </div>

//                         <div className="security-form-group-alt">
//                             <label htmlFor="name" className="security-form-label-alt">
//                                 <MdOutlinePerson className="security-label-icon" />
//                                 Name
//                             </label>
//                             <input
//                                 type="text"
//                                 id="name"
//                                 name="name"
//                                 value={securityData.name}
//                                 onChange={handleChange}
//                                 className="security-form-input-alt disabled"
                                
//                             />
//                             {errors.name && <p className="security-form-error-alt">{errors.name}</p>}
//                         </div>

//                         <div className="security-form-group-alt">
//                             <label htmlFor="mobileNumber" className="security-form-label-alt">
//                                 <MdOutlinePhone className="security-label-icon" />
//                                 Mobile Number
//                             </label>
//                             <input
//                                 type="tel"
//                                 id="mobileNumber"
//                                 name="mobileNumber"
//                                 value={securityData.mobileNumber}
//                                 onChange={handleChange}
//                                 className="security-form-input-alt disabled"
                                
//                             />
//                             {errors.mobileNumber && <p className="security-form-error-alt">{errors.mobileNumber}</p>}
//                         </div>

//                         <div className="security-form-group-alt">
//                             <label htmlFor="staffId" className="security-form-label-alt">
//                                 <MdOutlineBadge className="security-label-icon" />
//                                 Staff ID
//                             </label>
//                             <input
//                                 type="text"
//                                 id="staffId"
//                                 name="staffId"
//                                 value={securityData.staffId}
//                                 onChange={handleChange}
//                                 className="security-form-input-alt"
//                                 placeholder="Enter staff ID"
                            
//                             />
//                             {errors.staffId && <p className="security-form-error-alt">{errors.staffId}</p>}
//                         </div>

//                         <div className="security-form-group-alt">
//                             <label htmlFor="verification" className="security-form-label-alt">
//                                 <MdOutlineVerifiedUser className="security-label-icon" />
//                                 Verification
//                             </label>
//                             <textarea
//                                 id="verification"
//                                 name="verification"
//                                 value={securityData.verification}
//                                 onChange={handleChange}
//                                 className="security-form-textarea-alt"
//                                 placeholder="Enter verification details"
//                                 rows="3"
//                                 disabled={isSubmitting}
//                             />
//                             {errors.verification && <p className="security-form-error-alt">{errors.verification}</p>}
//                         </div>

//                         <div className="security-form-group-alt">
//                             <label htmlFor="incidentReport" className="security-form-label-alt">
//                                 <MdOutlineReportProblem className="security-label-icon" />
//                                 Incident Reporting
//                             </label>
//                             <textarea
//                                 id="incidentReport"
//                                 name="incidentReport"
//                                 value={securityData.incidentReport}
//                                 onChange={handleChange}
//                                 className="security-form-textarea-alt"
//                                 placeholder="Describe the incident"
//                                 rows="4"
//                                 disabled={isSubmitting}
//                             />
//                             {errors.incidentReport && <p className="security-form-error-alt">{errors.incidentReport}</p>}
//                         </div>

//                         <div className="security-form-group-alt image-group">
//                             <label className="security-form-label-alt">
//                                 <MdOutlinePhotoCamera className="security-label-icon" />
//                                 Attach Images ({securityData.images.length}/10)
//                             </label>
//                             <input
//                                 type="file"
//                                 id="images"
//                                 name="images"
//                                 accept="image/*"
//                                 multiple
//                                 onChange={handleImageUpload}
//                                 className="security-form-input-alt"
//                                 style={{ display: 'none' }}
//                                 disabled={isSubmitting}
//                             />
//                             <button
//                                 type="button"
//                                 className="image-button-alt"
//                                 onClick={() => document.getElementById('images').click()}
//                                 disabled={isSubmitting || securityData.images.length >= 10}
//                             >
//                                 <MdOutlinePhotoCamera className="image-icon-alt" />
//                                 Add Images
//                             </button>
//                             <div className="image-previews-alt">
//                                 {imagePreviews.map((src, idx) => (
//                                     <div key={idx} className="image-preview-container">
//                                         <img src={src} alt={`Preview ${idx + 1}`} className="image-preview-alt" />
//                                         <button
//                                             type="button"
//                                             className="remove-image-btn"
//                                             onClick={() => removeImage(idx)}
//                                             disabled={isSubmitting}
//                                         >
//                                             ×
//                                         </button>
//                                     </div>
//                                 ))}
//                             </div>
//                             {errors.images && <p className="security-form-error-alt">{errors.images}</p>}
//                         </div>

//                         {/* Signature Pad */}
//                         {showSignaturePad ? (
//                             <div className="security-signature-container">
//                                 <p className="security-signature-heading">Please sign below:</p>
//                                 <SignaturePad
//                                     ref={sigCanvas}
//                                     penColor='rgb(48, 48, 48)'
//                                     canvasProps={{ width: 450, height: 200, className: 'security-signature-canvas' }}
//                                     onEnd={handleSignatureEnd}
//                                 />
//                                 <div className="security-signature-buttons">
//                                     <button
//                                         type="button"
//                                         className="clear-button-alt"
//                                         onClick={handleClearSignature}
//                                         disabled={isSubmitting}
//                                     >
//                                         Clear
//                                     </button>
//                                     <button
//                                         type="button"
//                                         className="security-submit-button-alt"
//                                         onClick={handleSubmit}
//                                         disabled={isSubmitting}
//                                     >
//                                         {isSubmitting ? 'Submitting...' : 'Submit Report'}
//                                     </button>
//                                 </div>
//                             </div>
//                         ) : (
//                             <button
//                                 type="button"
//                                 className="security-form-submit-button-alt"
//                                 onClick={handleSignatureStart}
//                                 disabled={isSubmitting}
//                             >
//                                 Signature
//                             </button>
//                         )}
//                     </form>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }

// export default Security;
