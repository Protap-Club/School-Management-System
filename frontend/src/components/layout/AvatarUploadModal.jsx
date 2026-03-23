import React, { useState, useRef } from 'react';
import { FaTimes, FaCamera } from 'react-icons/fa';
import { ButtonSpinner } from '../ui/Spinner';
import api from '../../lib/axios';

const AvatarUploadModal = ({ user, isOpen, onClose, onUploadSuccess }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [refreshKey, setRefreshKey] = useState(() => Date.now());
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        // Validation
        if (!selectedFile.type.startsWith('image/')) {
            setError('Please select an image file (JPG, PNG, WEBP).');
            return;
        }

        if (selectedFile.size > 1 * 1024 * 1024) {
            setError('File is too large. Maximum size is 1MB.');
            return;
        }

        setError('');
        setFile(selectedFile);

        // Preview
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(selectedFile);
    };

    const handleClose = () => {
        setFile(null);
        setPreview(null);
        setError('');
        setToastMessage('');
        onClose();
    };

    const handleUpload = async () => {
        if (!file) {
            fileInputRef.current?.click();
            return;
        }

        setUploading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const response = await api.patch('/users/me/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                // Show toast inside modal before closing
                setToastMessage('Avatar uploaded successfully!');
                setRefreshKey(Date.now());
                
                setTimeout(() => {
                    // Update Redux/Context (which might unmount/rerender parent) 
                    onUploadSuccess(response.data.data.avatarUrl);
                    handleClose();
                }, 2000); // Wait 2 seconds before closing
            }
        } catch (err) {
            setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to upload avatar.');
        } finally {
            setUploading(false);
        }
    };

    // Derived Display Image
    const displayImage = preview || user?.avatarUrl;

    return (
        <div className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-slideUp">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Profile Picture</h3>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                        disabled={uploading}
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col items-center">
                    {/* Big Square/Circular Preview */}
                    <div className="relative w-48 h-48 mb-6 group">
                        {displayImage ? (
                            <img
                                src={displayImage.startsWith('data:') ? displayImage : `${displayImage}${displayImage.includes('?') ? '&' : '?'}t=${refreshKey}`}
                                alt="Avatar Preview"
                                className="w-full h-full object-cover rounded-2xl border-4 border-gray-50 shadow-sm"
                            />
                        ) : (
                            <div className="w-full h-full rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center border-4 border-gray-50 shadow-sm">
                                <span className="text-6xl font-bold text-indigo-500">
                                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                            </div>
                        )}
                        
                        {/* Hover Overlay - Click to Change */}
                        {!uploading && (
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center text-white gap-2"
                            >
                                <FaCamera size={32} />
                                <span className="font-medium">Change Photo</span>
                            </button>
                        )}
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/jpeg, image/png, image/webp"
                        className="hidden"
                    />

                    {/* Error Message */}
                    {error && (
                        <div className="w-full p-3 mb-6 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium">
                            {error}
                        </div>
                    )}

                    {/* Success Toast Display */}
                    {toastMessage && (
                        <div className="w-full p-3 mb-6 bg-emerald-50 text-emerald-600 text-sm rounded-lg text-center font-medium">
                            {toastMessage}
                        </div>
                    )}

                    {/* Action Button */}
                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all ${
                            uploading 
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                            : file 
                                ? 'bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/30'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                    >
                        {uploading ? (
                            <>
                                <ButtonSpinner className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-600 rounded-full animate-spin" /> Uploading...
                            </>
                        ) : file ? (
                            'Save New Avatar'
                        ) : (
                            'Upload Your Avatar'
                        )}
                    </button>
                    
                    {!file && (
                        <p className="text-xs text-gray-400 mt-4 text-center">
                            JPG, PNG or WEBP. Max size 1MB.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AvatarUploadModal;
