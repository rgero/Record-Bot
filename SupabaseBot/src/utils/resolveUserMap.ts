import { getUsers } from "../services/users.api";

export const resolveUserMap = async (): Promise<Map<string, string[]>> => {
  const userList = await getUsers();
  
  const userRecord = new Map<string, string[]>();
  const allUserIds = userList.map(user => user.id);

  userList.forEach(user => {
    userRecord.set(user.name, [user.id]);
  });

  userRecord.set("Both", allUserIds);

  return userRecord;
};