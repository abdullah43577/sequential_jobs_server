import { Schema, Types, model } from 'mongoose';

interface IRefreshToken {
  token: string;
  user: Types.ObjectId;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    token: {
      type: String,
      required: true,
    },

    user: {
      ref: 'User',
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);

const RefreshToken = model<IRefreshToken>('RefreshToken', refreshTokenSchema);

export default RefreshToken;
