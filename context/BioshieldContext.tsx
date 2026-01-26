import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Sample, ResistanceCategory, SampleStatus, SampleEvent } from '../types';
import { MOCK_SAMPLES } from '../constants';

interface BioshieldContextType {
    samples: Sample[];
    results: Record<string, ResistanceCategory>;
    activeView: string;
    setView: (view: string) => void;
    addSample: (newSample: Omit<Sample, 'id' | 'status' | 'internalId' | 'history'> & { status?: SampleStatus }) => string;
    updateStatus: (id: string, status: SampleStatus) => void;
    addResult: (sampleId: string, resistance: ResistanceCategory) => void;
}

const BioshieldContext = createContext<BioshieldContextType | undefined>(undefined);

export const BioshieldProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [samples, setSamples] = useState<Sample[]>(MOCK_SAMPLES);
    const [results, setResults] = useState<Record<string, ResistanceCategory>>({
        's1': ResistanceCategory.S,
        's2': ResistanceCategory.HS,
        's3': ResistanceCategory.R,
        's5': ResistanceCategory.T,
    });
    const [activeView, setActiveView] = useState('map');

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

    const addResult = (sampleId: string, resistance: ResistanceCategory) => {
        setResults(prev => ({ ...prev, [sampleId]: resistance }));
        setSamples(prev => prev.map(s => {
            if (s.id === sampleId) {
                const newEvent: SampleEvent = {
                    id: `ev-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    type: 'RESULT_ADDED',
                    user: 'חוקר מעבדה',
                    description: `הוזנו תוצאות: ${resistance}`
                };
                return { ...s, history: [...s.history, newEvent] };
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
            addResult
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
