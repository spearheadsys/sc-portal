import { Network } from '../../networking/models/network';
import { MachineDisk } from './machine-disk';
import { Nic } from './nic';
import { MachineVolume } from './machine-volume';
import { CatalogImage } from '../../catalog/models/image';
import { CatalogPackage } from '../../catalog/models/package';

export class MachineRequest
{
  id: string;
  name: string;
  package: string;
  image: string;
  networks: Network[];
  tags: { key: string; value: string }[];
  metadata: { key: string; value: string }[];
  affinity: any[]; // Optional
  brand: string;
  firewall_enabled: boolean;
  deletion_protection: boolean;
  allow_shared_images: boolean; // Whether to allow provisioning from a shared image.
  volumes: MachineVolume[]; //  list of objects representing volumes to mount when the newly created machine boots
  disks: MachineDisk[]; // An array of disk objects to be created (bhyve)
  disk: number;
  encrypted: boolean; // Place this machine into an encrypted server. Optional.
  visible: boolean;
}

export class Machine extends MachineRequest
{
  nics: Nic[];
  imageDetails: CatalogImage;
  packageDetails: CatalogPackage;
  dns_names: string[];
  dnsList: any;
  memory: number;
  type: string;
  state: string;
  snapshots: any[];

  loading: boolean;
  working: boolean;
  shouldLoadInfo: boolean;
  infoLoaded: boolean;
  refreshInfo: boolean;
  shouldLoadNetworks: boolean;
  networksLoaded: boolean;
  refreshNetworks: boolean;
  shouldLoadSnapshots: boolean;
  snapshotsLoaded: boolean;
  volumesEnabled: boolean;
  metadataKeys: string[];
  tagKeys: string[];
  contextMenu: boolean;
}
