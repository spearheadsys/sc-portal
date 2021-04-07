export class FirewallRuleRequest
{
  description: string;
  enabled: boolean;
  rule: string;
}

export class FirewallRuleResponse extends FirewallRuleRequest
{
  id: string;
  global: boolean;
}

export class FirewallRule extends FirewallRuleResponse
{
  action: string;
  fromArray: { type: string; config: string }[];
  fromValue: string;
  toArray: { type: string; config: string }[];
  toValue: string;
  protocol: string;
  protocolConfig: string;
  working?: boolean;
}
