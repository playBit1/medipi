// src/types/auth.ts
/* This file defines TypeScript types for authentication-related entities, including user and session structures. It ensures type safety when handling authentication data throughout the application, making the code more robust and maintainable. */
export type User = {
  id: string;
  email: string;
  name: string;
};

export type Session = {
  user: User;
  expires: string;
};
