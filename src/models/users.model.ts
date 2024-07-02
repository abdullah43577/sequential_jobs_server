import { Schema, model } from 'mongoose';
import validator from 'validator';

interface IUser {
  name: string;
  username: string;
  email: string;
  password: string;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
    },

    username: {
      type: String,
      unique: true,
      required: true,
    },

    email: {
      type: String,
      unique: true,
      required: true,
      validate: {
        validator: (value: string) => validator.isEmail(value),
        message: 'Please provide a valid email address',
      },
    },

    password: {
      type: String,
      required: true,

      validate: {
        validator: (value: string) => validator.isLength(value, { min: 6 }),
        message: 'Password must be at least 6 characters long',
      },
    },

  },
  { timestamps: true }
);

const User = model<IUser>('User', userSchema);

export default User;
