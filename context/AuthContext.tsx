import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

type UserRole = 'sampler' | 'lab_admin' | null;

interface AuthContextType {
    user: User | null;
    role: UserRole;
    loading: boolean;
    isAdmin: boolean;
    isSampler: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    loading: true,
    isAdmin: false,
    isSampler: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // 1. Safety Check: Email must exist
                if (!currentUser.email) {
                    await signOut(auth);
                    setUser(null);
                    setRole(null);
                    setLoading(false);
                    return;
                }

                try {
                    // 2. Check Whitelist (Wait before setting User state!)
                    // IMPORTANT: Firestore document IDs are case-sensitive. 
                    // We assume the admin stored emails in LOWERCASE in the 'whitelist' collection.
                    const emailKey = currentUser.email.trim().toLowerCase();
                    const whitelistDoc = await getDoc(doc(db, 'whitelist', emailKey));

                    if (!whitelistDoc.exists()) {
                        console.warn('User not in whitelist:', emailKey);
                        alert(`Access Denied: The email ${emailKey} is not authorized. Please contact an administrator.`);
                        await signOut(auth); // Log out from Firebase SDK
                        setUser(null);
                        setRole(null);
                        setLoading(false);
                        return;
                    }

                    // 3. User is Verified -> Now we can update state
                    setUser(currentUser);

                    const whitelistData = whitelistDoc.data();
                    const assignedRole = whitelistData.role as UserRole || 'sampler';

                    // 4. Fetch or Create User Profile for Metadata
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

                    // SUPER ADMIN OVERRIDE
                    if (emailKey === 'ohad126@gmail.com') {
                        setRole('lab_admin');
                    } else if (userDoc.exists()) {
                        setRole(userDoc.data().role as UserRole);
                    } else {
                        // Use role from whitelist
                        setRole(assignedRole);
                    }
                } catch (error) {
                    console.error('Error verifying whitelist:', error);
                    alert('Authentication Error. Please try again.');
                    await signOut(auth);
                    setUser(null);
                    setRole(null);
                }
            } else {
                // Not authenticated
                setUser(null);
                setRole(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const value = {
        user,
        role,
        loading,
        isAdmin: role === 'lab_admin',
        isSampler: role === 'sampler' || role === 'lab_admin', // Admins can do everything samplers can
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
