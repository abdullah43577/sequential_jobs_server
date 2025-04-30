import User from "../models/users.model";

export const generateUsername = async (firstName: string, lastName: string) => {
  let username = `${firstName.toLowerCase()}${lastName.toLowerCase()}`;

  let user = await User.findOne({ username }).lean();

  let count = 1;
  while (user) {
    username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${count}`;
    user = await User.findOne({ username }).lean();
    count++;
  }

  return username;
};
