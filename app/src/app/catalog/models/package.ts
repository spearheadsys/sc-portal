export class CatalogPackage
{
  id: string;
  name: string;
  brand: string;
  memory: number;
  memorySize: string;
  memorySizeLabel: string;
  disk: number;
  diskSize: string;
  diskSizeLabel: string;
  swap: number;
  lwps: number;
  vcpus: number;
  version: string;
  group: string;
  description: string;
  disks: any[];
  flexible_disk: boolean;
  price: number;
}
