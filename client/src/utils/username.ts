import { UserRole } from "@/types";

export const generateUsername = (
  schoolName: string, 
  role: UserRole, 
  counter: number
): string => {
  // Create school abbreviation from name
  const abbreviation = schoolName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 3);

  // Create role abbreviation
  const roleAbbrev = getRoleAbbreviation(role);

  // Format counter with leading zeros
  const formattedCounter = counter.toString().padStart(3, '0');

  return `${abbreviation}-${roleAbbrev}-${formattedCounter}`;
};

const getRoleAbbreviation = (role: UserRole): string => {
  const roleMap: Record<UserRole, string> = {
    super_admin: 'SUP',
    admin: 'ADM',
    director: 'DIR',
    head_teacher: 'HT',
    class_teacher: 'CT',
    subject_teacher: 'ST',
    bursar: 'BUR'
  };

  return roleMap[role];
};

export const parseUsername = (username: string) => {
  const parts = username.split('-');
  if (parts.length !== 3) {
    throw new Error('Invalid username format');
  }

  return {
    schoolAbbr: parts[0],
    roleAbbr: parts[1],
    counter: parseInt(parts[2], 10)
  };
};
