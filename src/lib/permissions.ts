export const canCreatePrescription = (role: string) => {
    return role === "doctor";
  };
  
  export const canDeletePrescription = (role: string) => {
    return role === "admin";
  };
  
  export const canCreateVisit = (role: string) => {
    return role === "doctor";
  };
  
  export const canManagePatients = (role: string) => {
    return role === "admin" || role === "receptionist";
  };