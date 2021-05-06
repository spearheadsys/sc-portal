export class CatalogImage
{
  id: string;
  name: string;
  version: string;
  description: string;
  owner: string;
  public: boolean;
  published_at: Date;
  state: string;
  type: string;
  os: string;
  tags: { key: string; value: string };
  requirements: any;
  homepage: string;
  image_size: number;
  price: number;
}

export enum CatalogImageType
{
  InfrastructureContainer = 1,
  VirtualMachine = 2,
  Docker = 3,
  Custom = 4
}
