import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("MONGODB_URI is missing from environment variables");
}

const adminSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["SUPERADMIN", "OWNER", "MANAGER", "STAFF"],
      required: true,
    },
    permissions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
adminSchema.index(
  { role: 1 },
  {
    unique: true,
    partialFilterExpression: { role: "SUPERADMIN" },
  },
);

const Admin =
  mongoose.models.Admin || mongoose.model("Admin", adminSchema);
const rl = readline.createInterface({ input, output });

try {
  await mongoose.connect(mongoUri);
  await Admin.init();

  if (await Admin.exists({ role: "SUPERADMIN" })) {
    throw new Error("A Superadmin already exists; bootstrap can only run once.");
  }

  const name = (await rl.question("Superadmin name: ")).trim();
  const email = (await rl.question("Superadmin email: "))
    .trim()
    .toLowerCase();
  const password = await rl.question("Superadmin password: ");

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A name and valid email are required.");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (await Admin.exists({ email })) {
    throw new Error("An admin with this email already exists.");
  }

  await Admin.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: "SUPERADMIN",
    isActive: true,
  });

  console.log(`Superadmin "${email}" created successfully.`);
} finally {
  rl.close();
  if (mongoose.connection.readyState) {
    await mongoose.disconnect();
  }
}
