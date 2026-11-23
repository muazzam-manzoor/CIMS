import mongoose, { Document, Model, Schema } from "mongoose";
import type { AdminRole } from "@/lib/roles";

type ManagedRole = Exclude<AdminRole, "SUPERADMIN">;

export interface IRolePermissions extends Document {
  role: ManagedRole;
  permissions: string[];
}

const rolePermissionsSchema = new Schema<IRolePermissions>(
  {
    role: {
      type: String,
      enum: ["OWNER", "MANAGER", "STAFF"],
      required: true,
      unique: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

const RolePermissions: Model<IRolePermissions> =
  mongoose.models.RolePermissions ||
  mongoose.model<IRolePermissions>("RolePermissions", rolePermissionsSchema);

export default RolePermissions;
