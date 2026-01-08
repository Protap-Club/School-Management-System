import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import api from '../api/axios';
import { FaBuilding, FaSearch, FaPlus, FaUserShield, FaChalkboardTeacher, FaUserGraduate } from 'react-icons/fa';
import AddInstituteModal from '../components/AddInstituteModal';

const InstitutesPage = () => {
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);

    const fetchInstitutes = async () => {
        try {
            const response = await api.get('/institute');
            if (response.data.success) {
                setInstitutes(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch institutes', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInstitutes();
    }, []);

    const handleInstituteCreated = () => {
        fetchInstitutes();
        setShowModal(false);
    };

    const filteredInstitutes = institutes.filter(inst =>
        inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Institutes</h1>
                        <p className="text-gray-500 mt-1">Manage all institutes in the system</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl shadow-lg shadow-purple-600/30 transition-all font-medium"
                    >
                        <FaPlus />
                        <span>Add Institute</span>
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    />
                </div>

                {/* Institutes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredInstitutes.map((institute) => (
                        <div
                            key={institute._id}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300"
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex items-center gap-3">
                                {institute.logoUrl ? (
                                    <img
                                        src={institute.logoUrl}
                                        alt={institute.name}
                                        className="w-12 h-12 rounded-lg object-cover bg-white/20 p-1"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                                        <FaBuilding className="text-white text-xl" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-lg font-bold text-white">{institute.name}</h3>
                                    <p className="text-purple-100 text-sm">{institute.code}</p>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="p-4">
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                                        <FaUserShield className="text-blue-600 mx-auto mb-1" />
                                        <p className="text-xl font-bold text-blue-600">{institute.adminCount || 0}</p>
                                        <p className="text-xs text-blue-500">Admins</p>
                                    </div>
                                    <div className="text-center p-3 bg-indigo-50 rounded-lg">
                                        <FaChalkboardTeacher className="text-indigo-600 mx-auto mb-1" />
                                        <p className="text-xl font-bold text-indigo-600">{institute.teacherCount || 0}</p>
                                        <p className="text-xs text-indigo-500">Teachers</p>
                                    </div>
                                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                                        <FaUserGraduate className="text-purple-600 mx-auto mb-1" />
                                        <p className="text-xl font-bold text-purple-600">{institute.studentCount || 0}</p>
                                        <p className="text-xs text-purple-500">Students</p>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                {(institute.contactEmail || institute.contactPhone) && (
                                    <div className="border-t border-gray-100 pt-3 text-sm text-gray-500">
                                        {institute.contactEmail && <p>📧 {institute.contactEmail}</p>}
                                        {institute.contactPhone && <p>📞 {institute.contactPhone}</p>}
                                    </div>
                                )}

                                {/* Status */}
                                <div className="mt-3 flex justify-between items-center">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${institute.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${institute.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        {institute.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredInstitutes.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            {searchTerm ? 'No institutes found matching your search.' : 'No institutes yet. Create your first institute!'}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Institute Modal */}
            {showModal && (
                <AddInstituteModal
                    onClose={() => setShowModal(false)}
                    onSuccess={handleInstituteCreated}
                />
            )}
        </DashboardLayout>
    );
};

export default InstitutesPage;
