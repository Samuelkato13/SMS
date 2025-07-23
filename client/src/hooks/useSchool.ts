import { useSchoolContext } from '@/contexts/SchoolContext';

export const useSchool = () => {
  const context = useSchoolContext();
  
  return {
    ...context,
    schoolName: context.school?.name || '',
    schoolLogo: context.school?.logoUrl || '',
    schoolAbbreviation: context.school?.abbreviation || '',
  };
};
