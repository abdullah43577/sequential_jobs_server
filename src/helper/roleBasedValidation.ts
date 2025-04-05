import { IUser } from "../utils/types/modelTypes";

type Roles = "job-seeker" | "company" | "panelist" | "medical-expert" | "admin" | "super-admin";

export const roleBasedValidation = (role: Roles, field: string) => {
  return {
    validator: function (this: IUser, value: string | null) {
      if (this.role === role && !value) return false;
      return true;
    },
    message: `${field} is required for ${role.charAt(0).toUpperCase() + role.slice(1)} Accounts`,
  };
};
