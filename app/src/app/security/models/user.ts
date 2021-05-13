import { Role } from './role';

export class UserRequest
{
  companyName: string;
  firstName: string;
  lastName: string;
  login: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  state: string;
  country: string;
  password: string;
}

export class UserResponse extends UserRequest
{
  id: string;
  created: Date;
  updated: Date;
}

export class User extends UserResponse
{
  roles: Role[];
  working: boolean;
}
