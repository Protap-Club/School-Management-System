import React, { useState, useRef, useEffect } from 'react';
import { FaFilter, FaSearch, FaArchive, FaUserPlus } from 'react-icons/fa';

export const UserFilters = ({
    allowedRoles,
    roleLabels,
    selectedRole,
    onRoleChange,
    searchQuery,
    onSearchChange,
    showArchived,
    onToggleArchived,
    isAdminOrAbove,
    onAddUserSelect
}) => {
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsAddMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (allowedRoles.length === 0) return null;

    return (
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
            <div className="flex items-center gap-3 relative z-40 flex-shrink-0">
                {allowedRoles.length > 1 && (
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 h-10 min-w-[140px]">
                        <FaFilter className="text-gray-400" size={12} />
                        <select
                            value={selectedRole}
                            onChange={(e) => onRoleChange(e.target.value)}
                            className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer w-full"
                        >
                            <option value="all">Roles</option>
                            {allowedRoles.map(role => (
                                <option key={role} value={role}>{roleLabels[role]?.label || role}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className={`relative z-0 ${allowedRoles.length === 1 ? 'w-full sm:w-64 sm:absolute sm:left-1/2 sm:-translate-x-1/2' : 'w-full sm:w-64 sm:mx-auto'}`}>
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400"><FaSearch size={14} /></span>
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
            </div>

            <div className="flex items-center gap-2 sm:ml-auto">
                {isAdminOrAbove && (
                    <button
                        onClick={onToggleArchived}
                        className={`flex items-center justify-center gap-2 px-4 h-10 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${showArchived
                            ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-700'}`}
                        title={showArchived ? 'View Active Users' : 'View Archived Users'}
                    >
                        <FaArchive size={14} /><span className="hidden lg:inline">{showArchived ? 'Active' : 'Archive'}</span>
                    </button>
                )}

                {!showArchived && (
                    <div className="relative" ref={dropdownRef}>
                        <button 
                            className="btn-primary px-5 rounded-lg shadow-sm hover:shadow-md"
                            onClick={() => {
                                if (allowedRoles.length === 1) {
                                    onAddUserSelect(allowedRoles[0]);
                                } else {
                                    setIsAddMenuOpen(!isAddMenuOpen);
                                }
                            }}
                        >
                            <FaUserPlus size={14} /><span className="hidden sm:inline">Add User</span><span className="sm:hidden">Add</span>
                        </button>
                        {allowedRoles.length > 1 && (
                            <div className={`absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-gray-100 transition-all duration-200 z-20 py-1.5 overflow-hidden ${isAddMenuOpen ? 'opacity-100 visible transform translate-y-0' : 'opacity-0 invisible transform translate-y-1'}`}>
                                {allowedRoles.map(role => {
                                    const config = roleLabels[role];
                                    const Icon = config?.icon || FaUserPlus;
                                    return (
                                        <button
                                            key={role}
                                            onClick={() => {
                                                setIsAddMenuOpen(false);
                                                onAddUserSelect(role);
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors text-sm"
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config?.menuIconClass || 'bg-gray-50 text-gray-600'}`}><Icon size={14} /></div>
                                            <span>Add {config?.label || role}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
