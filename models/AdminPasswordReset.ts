import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAdminPasswordReset extends Document {
  adminId: mongoose.Types.ObjectId;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  lastSentAt: Date;
}

const adminPasswordResetSchema =
  new Schema<IAdminPasswordReset>(
    {
      adminId: {
        type: Schema.Types.ObjectId,
        ref: "Admin",
        required: true,
        unique: true,
      },
      codeHash: {
        type: String,
        required: true,
      },
      expiresAt: {
        type: Date,
        required: true,
        expires: 0,
      },
      attempts: {
        type: Number,
        required: true,
        default: 0,
      },
      lastSentAt: {
        type: Date,
        required: true,
      },
    },
    { timestamps: true },
  );

const AdminPasswordReset: Model<IAdminPasswordReset> =
  mongoose.models.AdminPasswordReset ||
  mongoose.model<IAdminPasswordReset>(
    "AdminPasswordReset",
    adminPasswordResetSchema,
  );

export default AdminPasswordReset;
