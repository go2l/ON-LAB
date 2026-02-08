import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Sample, ResistanceCategory, SampleStatus, SampleEvent, SensitivityTest } from '../types';

interface BioshieldContextType {
    samples: Sample[];
    results: Record<string, SensitivityTest[]>;
    activeView: string;
    setView: (view: string) => void;
    addSample: (newSample: Omit<Sample, 'id' | 'status' | 'internalId' | 'history'> & { status?: SampleStatus }) => Promise<string>;
    updateStatus: (id: string, status: SampleStatus) => Promise<void>;
    addResult: (sampleId: string, results: SensitivityTest[]) => Promise<void>;
    selectedSampleId: string | null;
    selectSample: (id: string | null) => void;
    toggleArchive: (id: string, isArchived: boolean) => Promise<void>;
    deleteSample: (id: string) => Promise<void>;
}

const BioshieldContext = createContext<BioshieldContextType | undefined>(undefined);

export const BioshieldProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [samples, setSamples] = useState<Sample[]>([]);
    const [results, setResults] = useState<Record<string, SensitivityTest[]>>({});
    const [activeView, setActiveView] = useState('landing');
    const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);

    // Real-time listener for samples
    useEffect(() => {
        const q = query(collection(db, 'samples'), orderBy('date', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedSamples: Sample[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Sample));

            setSamples(fetchedSamples);

            // Extract results for backward compatibility with UI components expecting separate results map
            const extractedResults: Record<string, SensitivityTest[]> = {};
            fetchedSamples.forEach(s => {
                if (s.results) {
                    extractedResults[s.id] = s.results;
                }
            });
            setResults(extractedResults);
        }, (error) => {
            console.error("Error fetching samples: ", error);
        });

        return () => unsubscribe();
    }, []);

    const selectSample = (id: string | null) => {
        setSelectedSampleId(id);
    };

    const addSample = async (newSampleData: Omit<Sample, 'id' | 'status' | 'internalId' | 'history'> & { status?: SampleStatus }) => {
        console.log("Generating ID with NEW logic V2"); // Debug to confirm reload
        // Generate Sequential Semantic ID
        const pathogen = newSampleData.pathogen || 'Unknown';
        
        let prefix = 'UN';
        if (pathogen.includes('Botrytis')) {
             prefix = 'B';
        } else if (pathogen.includes('Podosphaera')) {
             prefix = 'P';
        } else if (pathogen.includes('Alternaria')) {
             prefix = 'A';
        } else {
             prefix = pathogen.substring(0, 1).toUpperCase();
        }

        console.log(`Selected prefix for ${pathogen}: ${prefix}`);

        // Find highest existing number for this prefix
        const existingIds = samples
            .map(s => s.internalId)
            .filter(id => id && id.startsWith(prefix));
        
        let maxNum = 0;
        existingIds.forEach(id => {
            // Remove prefix which is 1 char (or 2 if UN)
            const numPartStr = id.replace(prefix, '');
            const numPart = parseInt(numPartStr);
            if (!isNaN(numPart) && numPart > maxNum) {
                maxNum = numPart;
            }
        });

        const nextNum = maxNum + 1;
        const newInternalId = `${prefix}${nextNum.toString().padStart(3, '0')}`;
        console.log(`Generated new ID: ${newInternalId}`);
        
        const timestamp = new Date().toISOString();

        const initialEvent: SampleEvent = {
            id: `ev-${Date.now()}`,
            timestamp,
            type: 'CREATED',
            user: newSampleData.collectorName,
            description: 'דגימה נוצרה בשטח'
        };

        const newSample: Omit<Sample, 'id'> = {
            ...newSampleData,
            internalId: newInternalId,
            status: newSampleData.status || SampleStatus.PENDING_LAB_CONFIRMATION,
            isArchived: false,
            history: [initialEvent],
            pesticideHistory: newSampleData.pesticideHistory || [],
            results: []
        };

        try {
            const docRef = await addDoc(collection(db, 'samples'), newSample);
            console.log("Document written with ID: ", docRef.id);
            return newInternalId; // Return the short semantic ID
        } catch (e) {
            console.error("Error adding document: ", e);
            throw e;
        }
    };

    const updateStatus = async (id: string, status: SampleStatus) => {
        try {
            const sampleRef = doc(db, 'samples', id);
            
            const newEvent: SampleEvent = {
                id: `ev-${Date.now()}`,
                timestamp: new Date().toISOString(),
                type: status === SampleStatus.RECEIVED_LAB ? 'LAB_CONFIRMATION' : 'STATUS_CHANGE',
                user: 'צוות מעבדה', // In a real app, pass actual user
                description: `סטטוס שונה ל: ${status}`
            };

            const sample = samples.find(s => s.id === id);
            if (!sample) return;

            const updatedHistory = [...sample.history, newEvent];

            await updateDoc(sampleRef, {
                status,
                history: updatedHistory
            });
        } catch (e) {
            console.error("Error updating status: ", e);
            throw e; // Propagate error so UI can show toast if we had one
        }
    };

    const toggleArchive = async (id: string, isArchived: boolean) => {
        try {
            const sampleRef = doc(db, 'samples', id);
            await updateDoc(sampleRef, { isArchived });
        } catch (e) {
            console.error("Error toggling archive: ", e);
        }
    };

    const deleteSample = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'samples', id));
        } catch (e) {
            console.error("Error deleting sample: ", e);
        }
    };

    const addResult = async (sampleId: string, newResults: SensitivityTest[]) => {
        try {
            const sample = samples.find(s => s.id === sampleId);
            if (!sample) return;

            const oldResults = sample.results || [];
            const oldResultsMap = new Map<string, SensitivityTest>(oldResults.map(r => [r.id, r]));

            const addedTests: SensitivityTest[] = [];
            const updatedTests: SensitivityTest[] = [];

            newResults.forEach(newTest => {
                const oldTest = oldResultsMap.get(newTest.id);
                if (!oldTest) {
                    addedTests.push(newTest);
                } else {
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

            const updatedHistory = [...sample.history, ...addedEvents, ...updatedEvents];

            const sampleRef = doc(db, 'samples', sampleId);
            await updateDoc(sampleRef, {
                results: newResults,
                history: updatedHistory,
            });
        } catch (e) {
            console.error("Error adding results: ", e);
        }
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
            selectSample,
            toggleArchive,
            deleteSample
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
