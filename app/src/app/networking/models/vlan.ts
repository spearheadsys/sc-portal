import { Network } from './network';

export class VirtualAreaNetworkRequest
{
  vlan_id: number;
  name: string;
  description: string;
}

export class VirtualAreaNetwork extends VirtualAreaNetworkRequest
{
  networks: Network[];
  public: boolean;
  working: boolean;
  expanded: boolean;
}
