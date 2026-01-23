import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'timetableData';

export const useTimetableData = () => {
  // Initialize state from localStorage
  const [timetableData, setTimetableData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  });

  // Helper to persist data
  const saveToStorage = (newData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      // Dispatch a custom event for same-tab updates if needed, 
      // though React state usually handles this. 
      // But if we had multiple components using this hook independently, 
      // we'd need a storage event dispatch simulation or context.
      // For now, simple setTimetableData + localStorage is enough for 
      // single-page usage, but 'storage' event covers cross-tab.
      window.dispatchEvent(new Event('local-storage-update'));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  // Update entry
  const addOrUpdateEntry = useCallback((newEntry) => {
    console.log('useTimetableData: Adding/Updating entry:', newEntry);
    setTimetableData(prev => {
      // Remove existing entry for the same slot (if editing or overwriting)
      const filtered = prev.filter(
        item => !(
          item.classId === newEntry.classId &&
          item.day === newEntry.day &&
          item.timeSlotId === newEntry.timeSlotId
        )
      );
      const updated = [...filtered, newEntry];
      saveToStorage(updated);
      return updated;
    });
  }, []);

  // Delete entry
  const deleteEntry = useCallback((entryDto) => {
    if (!entryDto) return;
    setTimetableData(prev => {
      const updated = prev.filter(item => item.id !== entryDto.id);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  // Listen for changes from other tabs (or forced events)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY || e.type === 'local-storage-update') {
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          setTimetableData(saved ? JSON.parse(saved) : []);
        } catch (error) {
          console.error('Error syncing storage:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-update', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-update', handleStorageChange);
    };
  }, []);

  return {
    timetableData,
    addOrUpdateEntry,
    deleteEntry
  };
};
