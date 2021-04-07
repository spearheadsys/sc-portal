import { RoleUser } from './role-user';
import { RolePolicy } from './role-policy';

export class Role
{
  id: string;
  name: string;
  policies: RolePolicy[];
  members: RoleUser[];
}
