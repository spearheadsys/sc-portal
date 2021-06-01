export class MachineVolume
{
  name: string;
  type: string; // "tritonnfs"
  mode: string; // "ro" / "rw"
  mountpoint: string; // must start with a "/"
}
