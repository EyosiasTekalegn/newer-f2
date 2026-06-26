import { collection, doc, addDoc, getDocs, getDoc, updateDoc, deleteDoc, query, where, Timestamp, setDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export interface Role {
  id: string;
  name: string;               // e.g., "Admin", "Manager", "Staff", "Viewer"
  permissions: string[];      // e.g., ["customers.read", "customers.write", "bookings.read", ...]
  isDefault: boolean;         // default role for new users
  createdAt: Date;
}

export interface UserRole {
  id: string;                 // uid
  uid: string;
  email: string;
  roleId: string;
  updatedAt: Date;
}

const rolesCollection = collection(db, 'roles');
const usersCollection = collection(db, 'users');

const ALL_PERMISSIONS = [
  'customers.read', 'customers.write', 'customers.delete',
  'bookings.read', 'bookings.write', 'bookings.delete',
  'rentals.read', 'rentals.write', 'rentals.delete',
  'quotations.read', 'quotations.write', 'quotations.delete',
  'inventory.read', 'inventory.write', 'inventory.delete',
  'logistics.read', 'logistics.write', 'logistics.delete',
  'workforce.read', 'workforce.write', 'workforce.delete',
  'finance.read', 'finance.write', 'finance.delete',
  'settings.read', 'settings.write',
  'audit.read'
];

/**
 * Auto-seed initial roles if the roles collection is empty
 */
const seedDefaultRoles = async (): Promise<void> => {
  try {
    const snapshot = await getDocs(rolesCollection);
    if (snapshot.empty) {
      const defaultRoles = [
        {
          name: 'Admin',
          permissions: ALL_PERMISSIONS,
          isDefault: false
        },
        {
          name: 'Manager',
          permissions: ALL_PERMISSIONS.filter(p => !p.endsWith('.delete') && p !== 'audit.read'),
          isDefault: false
        },
        {
          name: 'Staff',
          permissions: [
            'customers.read', 'customers.write',
            'bookings.read', 'bookings.write',
            'rentals.read', 'rentals.write',
            'quotations.read', 'quotations.write',
            'inventory.read',
            'logistics.read', 'logistics.write'
          ],
          isDefault: true
        },
        {
          name: 'Viewer',
          permissions: ALL_PERMISSIONS.filter(p => p.endsWith('.read')),
          isDefault: false
        }
      ];

      for (const role of defaultRoles) {
        await addDoc(rolesCollection, {
          ...role,
          createdAt: Timestamp.fromDate(new Date())
        });
      }
    }
  } catch (error) {
    console.error("Failed to seed default roles:", error);
  }
};

/**
 * Get all roles
 */
export const getRoles = async (): Promise<Role[]> => {
  try {
    await seedDefaultRoles();
    const snapshot = await getDocs(rolesCollection);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        permissions: data.permissions || [],
        isDefault: !!data.isDefault,
        createdAt: data.createdAt?.toDate() || new Date()
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'roles', auth);
    throw error;
  }
};

/**
 * Add a new role
 */
export const addRole = async (data: Omit<Role, 'id' | 'createdAt'>): Promise<string> => {
  try {
    // If setting as default, unset other defaults first
    if (data.isDefault) {
      const snapshot = await getDocs(query(rolesCollection, where('isDefault', '==', true)));
      for (const docSnap of snapshot.docs) {
        await updateDoc(docSnap.ref, { isDefault: false });
      }
    }

    const docRef = await addDoc(rolesCollection, {
      ...data,
      createdAt: Timestamp.fromDate(new Date())
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'roles', auth);
    throw error;
  }
};

/**
 * Update an existing role
 */
export const updateRole = async (id: string, data: Partial<Omit<Role, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    if (data.isDefault) {
      const snapshot = await getDocs(query(rolesCollection, where('isDefault', '==', true)));
      for (const docSnap of snapshot.docs) {
        if (docSnap.id !== id) {
          await updateDoc(docSnap.ref, { isDefault: false });
        }
      }
    }

    const docRef = doc(db, 'roles', id);
    await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `roles/${id}`, auth);
    throw error;
  }
};

/**
 * Delete a role (only if not assigned to any user)
 */
export const deleteRole = async (id: string): Promise<void> => {
  try {
    // Check if role is assigned to any user
    const userQuery = query(usersCollection, where('roleId', '==', id));
    const userSnap = await getDocs(userQuery);
    if (!userSnap.empty) {
      throw new Error("Cannot delete role: This role is currently assigned to one or more users.");
    }

    const docRef = doc(db, 'roles', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `roles/${id}`, auth);
    throw error;
  }
};

/**
 * Fetch all users with their assigned roleId
 */
export const getUsersWithRoles = async (): Promise<UserRole[]> => {
  try {
    const snapshot = await getDocs(usersCollection);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        uid: data.uid || doc.id,
        email: data.email || '',
        roleId: data.roleId || '',
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users', auth);
    throw error;
  }
};

/**
 * Assign a role to a user
 */
export const assignRoleToUser = async (userId: string, roleId: string, email: string): Promise<void> => {
  try {
    const docRef = doc(db, 'users', userId);
    await setDoc(docRef, {
      uid: userId,
      email,
      roleId,
      updatedAt: Timestamp.fromDate(new Date())
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`, auth);
    throw error;
  }
};

/**
 * Get user's assigned role
 */
export const getUserRole = async (userId: string): Promise<Role | null> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);

    let roleId = '';
    if (userSnap.exists()) {
      roleId = userSnap.data().roleId;
    }

    const roles = await getRoles();

    if (roleId) {
      const matchedRole = roles.find(r => r.id === roleId);
      if (matchedRole) return matchedRole;
    }

    // Fallback to default role
    const defaultRole = roles.find(r => r.isDefault);
    if (defaultRole) return defaultRole;

    // Absolute fallback: Admin or first role
    return roles[0] || null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`, auth);
    throw error;
  }
};

/**
 * Check if user has specific permission
 */
export const hasPermission = async (userId: string, permission: string): Promise<boolean> => {
  try {
    const role = await getUserRole(userId);
    if (!role) return false;
    // Admins have override for all permissions
    if (role.name === 'Admin' || role.permissions.includes(ALL_PERMISSIONS[0])) {
      return true;
    }
    return role.permissions.includes(permission);
  } catch (error) {
    console.error("Failed to check permission:", error);
    return false;
  }
};
