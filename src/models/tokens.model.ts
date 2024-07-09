import { Schema, model } from 'mongoose';

interface IRefreshToken {
  token: string[];
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    token: [
      {
        type: String,
        required: true,
      },
    ],
  },
  { timestamps: true }
);

const RefreshToken = model<IRefreshToken>('RefreshToken', refreshTokenSchema);

export default RefreshToken;
