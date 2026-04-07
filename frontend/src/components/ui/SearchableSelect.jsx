import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FaSearch, FaChevronDown, FaTimes } from 'react-icons/fa';

/**
 * A modular, searchable single-select component.
 * @param {Array} options - Array of objects with { value, label, sublabel }
 */
const SearchableSelect = ({ 
    options = [], 
    value, 
    onChange, 
    placeholder = "Select option", 
    label, 
    error, 
    disabled,
    loading 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);

    const selectedOption = useMemo(() => 
        options.find(opt => String(opt.value) === String(value)), 
    [options, value]);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const lowSearch = searchTerm.toLowerCase();
        return options.filter(opt => 
            opt.label.toLowerCase().includes(lowSearch) || 
            (opt.sublabel && opt.sublabel.toLowerCase().includes(lowSearch))
        );
    }, [options, searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val) => {
        onChange(val);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className="relative" ref={containerRef}>
            {label && (
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                    {label}
                </label>
            )}
            
            <button
                type="button"
                disabled={disabled || loading}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-3 py-1.5 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all flex items-center justify-between bg-white text-left ${
                    error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/10'
                } ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-300'}`}
            >
                <span className={`truncate ${!selectedOption ? 'text-gray-400 font-normal' : 'text-gray-900 font-bold'}`}>
                    {loading ? 'Loading...' : (selectedOption ? selectedOption.label : placeholder)}
                </span>
                <FaChevronDown 
                    size={10} 
                    className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-[60] overflow-hidden animate-fadeIn slide-in-from-top-2 duration-200 min-w-[240px]">
                    {/* Search Field */}
                    <div className="p-2 border-b border-gray-50 bg-gray-50/30">
                        <div className="relative">
                            <FaSearch size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                autoFocus
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search..."
                                className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
                            />
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <FaTimes size={10} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-400 italic text-xs">
                                No results found
                            </div>
                        ) : (
                            filteredOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleSelect(opt.value)}
                                    className={`w-full px-4 py-2 text-left hover:bg-primary/5 group transition-colors flex flex-col ${
                                        String(opt.value) === String(value) ? 'bg-primary/5' : ''
                                    }`}
                                >
                                    <span className={`text-[13px] font-bold ${
                                        String(opt.value) === String(value) ? 'text-primary' : 'text-gray-700 group-hover:text-gray-900'
                                    }`}>
                                        {opt.label}
                                    </span>
                                    {opt.sublabel && (
                                        <span className="text-[10px] text-gray-400 font-medium">
                                            {opt.sublabel}
                                        </span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {error && <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold">{error}</p>}
        </div>
    );
};

export default SearchableSelect;
