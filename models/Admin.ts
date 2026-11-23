import mongoose, {
    Document,
    Model,
    Schema,
  } from "mongoose";
import type { AdminRole } from "@/lib/roles";

export type { AdminRole } from "@/lib/roles";
  
  export interface IAdmin extends Document {
    name: string;
    email: string;
    passwordHash: string;
    role: AdminRole;
    permissions: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
  
  const adminSchema = new Schema<IAdmin>(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },
  
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true,
        index: true,
      },
  
      passwordHash: {
        type: String,
        required: true,
      },
  
      role: {
        type: String,
        enum: ["SUPERADMIN", "OWNER", "MANAGER", "STAFF"],
        default: "OWNER",
      },

      permissions: {
        type: [String],
        default: [],
      },
  
      isActive: {
        type: Boolean,
        default: true,
        index: true,
      },
    },
    {
      timestamps: true,
    },
  );

  adminSchema.index(
    { role: 1 },
    {
      unique: true,
      partialFilterExpression: { role: "SUPERADMIN" },
    },
  );
  
  const Admin: Model<IAdmin> =
    mongoose.models.Admin ||
    mongoose.model<IAdmin>("Admin", adminSchema);
  
  export default Admin;