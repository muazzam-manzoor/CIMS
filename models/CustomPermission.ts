import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICustomPermission extends Document {
  key: string;
  name: string;
  description: string;
  grants: string[];
}

const customPermissionSchema = new Schema<ICustomPermission>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 240,
    },
    grants: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) => value.length > 0,
        message: "A custom permission must grant at least one built-in permission.",
      },
    },
  },
  { timestamps: true },
);

const CustomPermission: Model<ICustomPermission> =
  mongoose.models.CustomPermission ||
  mongoose.model<ICustomPermission>("CustomPermission", customPermissionSchema);

export default CustomPermission;
