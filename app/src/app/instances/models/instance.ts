import { Network } from '../../networking/models/network';
import { InstanceDisk } from './instance-disk';
import { Nic } from './nic';
import { InstanceVolume } from './instance-volume';
import { CatalogImage } from '../../catalog/models/image';
import { CatalogPackage } from '../../catalog/models/package';

export class InstanceRequest
{
  id: string;
  name: string;
  package: string;
  image: string;
  networks: Network[];
  tags: { key: string; value: string };
  metadata: { key: string; value: string };
  affinity: any[]; // Optional
  brand: string;
  firewall_enabled: boolean;
  deletion_protection: boolean;
  allow_shared_images: boolean; // Whether to allow provisioning from a shared image.
  volumes: InstanceVolume[]; //  list of objects representing volumes to mount when the newly created machine boots
  disks: InstanceDisk[]; // An array of disk objects to be created (bhyve)
  disk: number;
  encrypted: boolean; // Place this instance into an encrypted server. Optional.
  visible: boolean;
}

export class Instance extends InstanceRequest
{
  nics: Nic[];
  imageDetails: CatalogImage;
  packageDetails: CatalogPackage;
  dns_names: string[];
  dnsList: {};
  memory: number;
  type: string;
  state: string;

  loading: boolean;
  working: boolean;
  shouldLoadInfo: boolean;
  shouldLoadNetworks: boolean;
  shouldLoadSecurity: boolean;
  shouldLoadSnapshots: boolean;
  shouldLoadFirewallRules: boolean;
  volumesEnabled: boolean;
  metadataKeys: string[];
  tagKeys: string[];
}
