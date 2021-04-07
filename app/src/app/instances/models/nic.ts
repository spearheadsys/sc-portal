import { Network } from '../../networking/models/network';

export class Nic
{
  name: string;
  mac: string;
  ip: string;
  gateway: string;
  network: string;
  networkDetails: Network;
  networkName: string;
  state: string;
  primary: boolean;
}
