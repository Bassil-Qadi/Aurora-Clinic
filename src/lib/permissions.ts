export const canCreatePrescription = (role: string) => {
    return role === "super_admin" || role === "doctor";
  };
  
  export const canDeletePrescription = (role: string) => {
    return role === "super_admin" || role === "admin";
  };
  
  export const canCreateVisit = (role: string) => {
    return role === "super_admin" || role === "doctor";
  };
  
  export const canManagePatients = (role: string) => {
    return role === "super_admin" || role === "admin" || role === "receptionist";
  };

  export const isSuperAdmin = (role: string) => {
    return role === "super_admin";
  };
