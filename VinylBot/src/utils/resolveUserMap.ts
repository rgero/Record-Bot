import { User } from "../interfaces/User.js";
import { getUsers } from "../services/users.api.js";

export const resolveUserMap = async (): Promise<Map<string, string[]>> => {
  const userList: User[] = await getUsers();
  const userMap = new Map<string, string[]>();
  const allIds = userList.map(u => u.id);

  userList.forEach(user => {
    userMap.set(user.name.toLowerCase(), [user.id]);
  });
  userMap.set("both", allIds);

  return userMap;
};