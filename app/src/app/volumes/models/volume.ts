export class VolumeRequest
{
  type = 'tritonnfs'; // currently only "tritonnfs" is supported
  networks: string[];
  name: string; // <= 256 characters in length (Renaming a volume is not allowed for volumes that are referenced by active VMs. => check "refs" array property)
  size: number;
  tags: { ket: string; value: string };
  affinity: any[];
}

export class VolumeResponse extends VolumeRequest
{
  id: string;
  owner_uuid: string;
  state: string;
  created: Date;
  refs: string[]; // A list of VM UUIDs that reference this volume
  filesystem_path: string;
}

export class Volume extends VolumeResponse
{
  //  mode = 'rw'; // ro || rw
  //  mountpoint: string; // Specifies where the volume is mounted in the newly created machine's filesystem. It must start with a slash ("/") and it must contain at least one character that is not '/'.
  working: boolean;
}
