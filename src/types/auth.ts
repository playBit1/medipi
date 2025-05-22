export type User = {
  id: string;
  email: string;
  name: string;
};

export type Session = {
  user: User;
  expires: string;
};
