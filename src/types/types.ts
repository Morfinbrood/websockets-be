export type JoinMessage = {
  type: string;
  groupId: string;
  senderUUID: string;
};

export type RegularMessage = {
  type: string;
  groupIds: string[];
  text: string;
  senderUUID: string;
};

export type RegistrationMessage = {
  type: string;
  data: {
    name: string,
    password: string
  }
};
