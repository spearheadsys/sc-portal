export class EditNetworkRequest
{
  name: string;
  description: string;
  provision_start_ip: string;
  provision_end_ip: string;
  resolvers: string[];
  routes: {}; // Eg: { "10.25.1.0/21": "10.50.1.2", "10.27.1.0/21": "10.50.1.3" }
}

export class AddNetworkRequest extends EditNetworkRequest
{
  subnet: string;
  gateway: string;
  internet_nat: boolean;
}

export class Network extends AddNetworkRequest
{
  id: string;
  public: boolean;
  fabric: boolean;
}
