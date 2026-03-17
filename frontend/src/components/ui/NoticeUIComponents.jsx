import React from 'react';
import { FaSearch } from 'react-icons/fa';

export const SectionHeader = ({ icon, iconBg, iconColor, title, subtitle }) => (
    <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl bg-linear-to-br ${iconBg} flex items-center justify-center`}>
            {React.cloneElement(icon, { className: iconColor, size: 18 })}
        </div>
        <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
    </div>
);

export const TabButton = ({ tab, activeTab, icon, label, setActiveTab, count }) => (
    <button onClick={() => setActiveTab(tab)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
        {icon && React.cloneElement(icon, { size: 12 })}{label}
        {count !== undefined && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                {count}
            </span>
        )}
    </button>
);

export const FilterSelect = ({ label, filterKey, options, historyFilters, setHistoryFilters }) => (
    <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 uppercase">{label}:</span>
        <select value={historyFilters[filterKey]} onChange={(e) => setHistoryFilters({ ...historyFilters, [filterKey]: e.target.value })}
            className="text-sm border-gray-200 rounded-lg focus:ring-primary focus:border-primary px-2 py-1 bg-white">
            {options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
    </div>
);

export const MemberList = ({ items, selectedArr, setSelectedArr, toggleSelection }) => (
    <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto">
        {items.map(item => (
            <label key={item._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0">
                <input type="checkbox" checked={selectedArr.includes(item._id)}
                    onChange={() => toggleSelection(selectedArr, setSelectedArr, item._id)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary" />
                <span className="text-sm text-gray-700">{item.name}</span>
            </label>
        ))}
    </div>
);

export const SearchableList = ({
    items,
    selectedArr,
    setSelectedArr,
    searchField,
    placeholder,
    searchTerm,
    setSearchTerm,
    toggleSelection,
    renderLabel,
    hideUntilSearch = false,
    emptyLabel,
    minSearchLength = 0
}) => {
    const term = searchTerm.trim().toLowerCase();
    const showEmptyPrompt = hideUntilSearch && term.length < minSearchLength;
    const filteredItems = showEmptyPrompt
        ? []
        : items.filter(item => searchField(item).toLowerCase().includes(term));
    const emptyText = showEmptyPrompt
        ? (emptyLabel || (minSearchLength > 0 ? `Type at least ${minSearchLength} characters` : 'Type to search'))
        : 'No results found';

    return (
        <div className="mt-3 space-y-3">
            <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input type="text" placeholder={placeholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    onClick={(e) => e.stopPropagation()} />
            </div>
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto cursor-default" onClick={e => e.stopPropagation()}>
                {filteredItems.map(item => (
                    <label key={item._id || item.value} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50 last:border-b-0">
                        <input type="checkbox" checked={selectedArr.includes(item._id || item.value)}
                            onChange={() => toggleSelection(selectedArr, setSelectedArr, item._id || item.value)}
                            className="w-3.5 h-3.5 text-primary border-gray-300 rounded focus:ring-primary" />
                        {renderLabel ? renderLabel(item) : <span>{item.name || item.label}</span>}
                    </label>
                ))}
                {filteredItems.length === 0 && (
                    <div className="px-3 py-4 text-center text-xs text-gray-400">{emptyText}</div>
                )}
            </div>
        </div>
    );
};

export const RadioOption = ({ value, title, subtitle, sendOption, setSendOption, setSearchTerm, expandedContent }) => (
    <label className={`flex items-${expandedContent && sendOption === value ? 'start' : 'center'} gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors`}>
        <input type="radio" name="sendOption" value={value} checked={sendOption === value}
            onChange={(e) => { setSendOption(e.target.value); if(setSearchTerm) setSearchTerm(''); }}
            className={`w-4 h-4 text-primary border-gray-300 focus:ring-primary${expandedContent && sendOption === value ? ' mt-0.5' : ''}`} />
        <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{title}</p>
            <p className="text-xs text-gray-400 mb-2">{subtitle}</p>
            {sendOption === value && expandedContent}
        </div>
    </label>
);
