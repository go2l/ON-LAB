import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Sample, ResistanceCategory, SampleStatus, SampleEvent, SensitivityTest } from '../types';
import { MOCK_SAMPLES } from '../constants';

interface BioshieldContextType {
    samples: Sample[];
    results: Record<string, SensitivityTest[]>;
    activeView: string;
    setView: (view: string) => void;
    addSample: (newSample: Omit<Sample, 'id' | 'status' | 'internalId' | 'history'> & { status?: SampleStatus }) => string;
    updateStatus: (id: string, status: SampleStatus) => void;
    addResult: (sampleId: string, results: SensitivityTest[]) => void;
    selectedSampleId: string | null;
    selectSample: (id: string | null) => void;
    toggleArchive: (id: string, isArchived: boolean) => void;
}

const BioshieldContext = createContext<BioshieldContextType | undefined>(undefined);

export const BioshieldProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [samples, setSamples] = useState<Sample[]>(MOCK_SAMPLES);
    const [results, setResults] = useState<Record<string, SensitivityTest[]>>({});
    const [activeView, setActiveView] = useState('landing');
    const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);

    const selectSample = (id: string | null) => {
        setSelectedSampleId(id);
    };

    const addSample = (newSampleData: Omit<Sample, 'id' | 'status' | 'internalId' | 'history'> & { status?: SampleStatus }) => {
        const newId = `BS-${Math.floor(Math.random() * 90000) + 10000}`;
        const timestamp = new Date().toISOString();

        const initialEvent: SampleEvent = {
            id: `ev-${Date.now()}`,
            timestamp,
            type: 'CREATED',
            user: newSampleData.collectorName,
            description: 'דגימה נוצרה בשטח'
        };

        const newSample: Sample = {
            ...newSampleData,
            id: `s-${Date.now()}`,
            internalId: newId,
            status: newSampleData.status || SampleStatus.PENDING_LAB_CONFIRMATION,
            isArchived: false,
            history: [initialEvent],
            pesticideHistory: newSampleData.pesticideHistory || []
        };
        setSamples(prev => [newSample, ...prev]);
        return newId;
    };

    const updateStatus = (id: string, status: SampleStatus) => {
        setSamples(prev => prev.map(s => {
            if (s.id === id) {
                const newEvent: SampleEvent = {
                    id: `ev-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    type: status === SampleStatus.RECEIVED_LAB ? 'LAB_CONFIRMATION' : 'STATUS_CHANGE',
                    user: 'צוות מעבדה',
                    description: `סטטוס שונה ל: ${status}`
                };
                return { ...s, status, history: [...s.history, newEvent] };
            }
            return s;
        }));
    };

    const toggleArchive = (id: string, isArchived: boolean) => {
        setSamples(prev => prev.map(s => {
            if (s.id === id) {
                return { ...s, isArchived };
            }
            return s;
        }));
    };

    const addResult = (sampleId: string, newResults: SensitivityTest[]) => {
        const oldResults = results[sampleId] || [];
        const oldResultsMap = new Map(oldResults.map(r => [r.id, r]));

        const addedTests: SensitivityTest[] = [];
        const updatedTests: SensitivityTest[] = [];

        newResults.forEach(newTest => {
            const oldTest = oldResultsMap.get(newTest.id);
            if (!oldTest) {
                addedTests.push(newTest);
            } else {
                // Check if meaningful fields changed
                const hasChanged =
                    oldTest.material !== newTest.material ||
                    oldTest.dosage !== newTest.dosage ||
                    oldTest.category !== newTest.category ||
                    oldTest.notes !== newTest.notes;

                if (hasChanged) {
                    updatedTests.push(newTest);
                }
            }
        });

        setResults(prev => ({ ...prev, [sampleId]: newResults }));

        if (addedTests.length === 0 && updatedTests.length === 0) return;

        setSamples(prev => prev.map(s => {
            if (s.id === sampleId) {
                const addedEvents: SampleEvent[] = addedTests.map(test => ({
                    id: `ev-${Date.now()}-add-${test.id}`,
                    timestamp: new Date().toISOString(),
                    type: 'RESULT_ADDED',
                    user: test.user || 'חוקר מעבדה',
                    description: `בדיקה נוספה: ${test.material} - ${test.dosage} PPM - ${test.category}`
                }));

                const updatedEvents: SampleEvent[] = updatedTests.map(test => ({
                    id: `ev-${Date.now()}-upd-${test.id}`,
                    timestamp: new Date().toISOString(),
                    type: 'RESULT_UPDATED',
                    user: test.user || 'חוקר מעבדה',
                    description: `עדכון תוצאה קיים: ${test.material} - ${test.dosage} PPM - ${test.category}`
                }));

                return { ...s, history: [...s.history, ...addedEvents, ...updatedEvents] };
            }
            return s;
        }));
    };

    return (
        <BioshieldContext.Provider value={{
            samples,
            results,
            activeView,
            setView: setActiveView,
            addSample,
            updateStatus,
            addResult,
            selectedSampleId,
            selectSample,
            toggleArchive
        }}>
            {children}
        </BioshieldContext.Provider>
    );
};

export const useBioshield = () => {
    const context = useContext(BioshieldContext);
    if (context === undefined) {
        throw new Error('useBioshield must be used within a BioshieldProvider');
    }
    return context;
};
