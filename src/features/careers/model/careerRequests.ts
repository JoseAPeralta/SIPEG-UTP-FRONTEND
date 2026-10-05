export type CreateCareerRequest = {
  code: string;
  description: string | null;
  name: string;
  unitId: string | null;
};

export type UpdateCareerRequest = Partial<CreateCareerRequest>;
