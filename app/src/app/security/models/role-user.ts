export class RoleUser
{
  id: string;
  type: string; // "subuser" or "account"
  login: string;
  default: boolean;
}
