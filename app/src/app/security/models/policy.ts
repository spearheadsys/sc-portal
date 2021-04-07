export class PolicyRequest
{
  name: string;
  description: string;
  rules: string[];
}


export class Policy extends PolicyRequest
{
  id: string;
}
