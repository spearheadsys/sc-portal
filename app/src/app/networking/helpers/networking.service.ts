import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { concatMap, delay, filter, first, flatMap, map, mergeMapTo, repeatWhen, switchMap, switchMapTo, take, takeUntil, tap } from 'rxjs/operators';
import { concat, empty, of, range, throwError, zip } from 'rxjs';
import { Cacheable } from 'ts-cacheable';
import { Network } from '../models/network';
import { Nic } from '../../instances/models/nic';
import { VirtualAreaNetwork } from '../models/vlan';
import { VirtualAreaNetworkRequest } from '../models/vlan';
import { EditNetworkRequest } from '../models/network';
import { AddNetworkRequest } from '../models/network';
import { Instance } from 'src/app/instances/models/instance';
import { InstanceCallbackFunction } from 'src/app/instances/helpers/instances.service';

const networksCacheBuster$ = new Subject<void>();

@Injectable({
  providedIn: 'root'
})
export class NetworkingService
{
  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly httpClient: HttpClient) { }

  // ----------------------------------------------------------------------------------------------------------------
  getDataCenters(): Observable<any[]>
  {
    return this.httpClient.get<any[]>(`/api/my/datacenters`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable({
    cacheBusterObserver: networksCacheBuster$
  })
  getNetworks(): Observable<Network[]>
  {
    return this.httpClient.get<Network[]>(`/api/my/networks`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable({
    cacheBusterObserver: networksCacheBuster$
  })
  getNetwork(id: string): Observable<Network>
  {
    return this.httpClient.get<Network>(`/api/my/networks/${id}`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getNetworkIPs(networkId: string): Observable<any[]>
  {
    return this.httpClient.get<any[]>(`/api/my/networks/${networkId}/ips`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getNetworkIP(networkId: string, ipAddress: string): Observable<any>
  {
    return this.httpClient.get<any>(`/api/my/networks/${networkId}/ips/${ipAddress}`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  editNetworkIP(networkId: string, ipAddress: string, value: {}): Observable<any>
  {
    return this.httpClient.put<any>(`/api/my/networks/${networkId}/ips/${ipAddress}`, value);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getFabricVirtualLocalAreaNetworks(): Observable<VirtualAreaNetwork[]>
  {
    return this.httpClient.get<VirtualAreaNetwork[]>(`/api/my/fabrics/default/vlans`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getFabricVirtualLocalAreaNetwork(vlanId: number): Observable<VirtualAreaNetwork>
  {
    return this.httpClient.get<VirtualAreaNetwork>(`/api/my/fabrics/default/vlans/${vlanId}`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  // "id" myt be between 0-4095
  addFabricVirtualLocalAreaNetwork(vlan: VirtualAreaNetworkRequest): Observable<VirtualAreaNetwork>
  {
    return this.httpClient.post<VirtualAreaNetwork>(`/api/my/fabrics/default/vlans`, vlan);
  }

  // ----------------------------------------------------------------------------------------------------------------
  editFabricVirtualLocalAreaNetwork(id: number, name: string, description?: string): Observable<VirtualAreaNetwork>
  {
    return this.httpClient.put<VirtualAreaNetwork>(`/api/my/fabrics/default/vlans/${id}`,
      {
        name,
        description
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  // NOTE: There must be no networks on that VLAN in order for the VLAN to be deleted.
  deleteFabricVirtualLocalAreaNetwork(vlanId: number): Observable<any>
  {
    return this.httpClient.delete(`/api/my/fabrics/default/vlans/${vlanId}`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getFabricNetworks(vlanId: number): Observable<Network[]>
  {
    return this.httpClient.get<Network[]>(`/api/my/fabrics/default/vlans/${vlanId}/networks`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getFabricNetwork(vlanId: number, networkId: number): Observable<Network>
  {
    return this.httpClient.get<Network>(`/api/my/fabrics/default/vlans/${vlanId}/networks/${networkId}`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  addFabricNetwork(vlanId: number, network: AddNetworkRequest): Observable<Network>
  {
    return this.httpClient.post<Network>(`/api/my/fabrics/default/vlans/${vlanId}/networks`, network)
      .pipe(tap(() => networksCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  editFabricNetwork(vlanId: number, networkId: string, network: EditNetworkRequest): Observable<Network>
  {
    return this.httpClient.put<Network>(`/api/my/fabrics/default/vlans/${vlanId}/networks/${networkId}`, network)
      .pipe(tap(() => networksCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteFabricNetworks(vlanId: number, networkId: string): Observable<any>
  {
    return this.httpClient.delete(`/api/my/fabrics/default/vlans/${vlanId}/networks/${networkId}`)
      .pipe(tap(() => networksCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  getNics(instanceId: string): Observable<Nic[]>
  {
    return this.httpClient.get<Nic[]>(`/api/my/machines/${instanceId}/nics`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getNic(instanceId: string, macAddress: string): Observable<Nic>
  {
    return this.httpClient.get<Nic>(`/api/my/machines/${instanceId}/nics/${macAddress.replace(/:/g, '')}`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getNicUntilAvailable(instance: any, nic: Nic, networkName: string, callbackFn?: NicCallbackFunction, maxRetries = 30): Observable<Nic>
  {
    networkName = networkName.toLocaleLowerCase();

    // Keep polling the instance until it reaches the expected state
    return this.getNic(instance.id, nic.mac)
      .pipe(
        tap(x => 
        {
          // We create our own state while the instance reboots
          if (x.state === 'running')
            x.state = 'starting';

          if (callbackFn)
            callbackFn(x);
        }),
        repeatWhen(x =>
        {
          let retries = 0;

          return x.pipe(
            delay(3000),
            map(() =>
            {
              if (retries++ === maxRetries)
                throw { error: { message: `Failed to retrieve the current status for network interface "${nic.mac}"` } };
            })
          );
        }),
        filter(x => x.state === 'running' || x.state === 'starting'),
        take(1), //  needed to stop the repeatWhen loop
        concatMap(nic => 
          this.httpClient.get<Instance>(`/api/my/machines/${instance.id}`)
          .pipe(
            tap(() => 
            {
              // We create our own state while the instance reboots
              nic.state = 'starting';

              if (callbackFn)
                callbackFn(nic);
            }),
            repeatWhen(x =>
            {
              let retries = 0;
    
              return x.pipe(
                delay(3000),
                map(() =>
                {
                  if (retries++ === maxRetries)
                    throw { error: { message: `Failed to retrieve the current status for network interface "${nic.mac}"` } };
                })
              );
            }),
            filter(x => x.state === 'running' && x.dns_names.some(d => d.toLocaleLowerCase().indexOf(networkName) >= 0)),
            take(1), //  needed to stop the repeatWhen loop
            map(() => 
            {
              // We manually set the state as "running" now that the instance has rebooted
              nic.state = 'running';

              if (callbackFn)
                callbackFn(nic);

              return nic;
            })
          )
        )
      );
  }

  // ----------------------------------------------------------------------------------------------------------------
  addNic(instanceId: string, networkId: string): Observable<Nic>
  {
    return this.httpClient.post<Nic>(`/api/my/machines/${instanceId}/nics`, { network: networkId });
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteNic(instanceId: string, macAddress: string): Observable<any>
  {
    return this.httpClient.delete(`/api/my/machines/${instanceId}/nics/${macAddress.replace(/:/g, '')}`);
  }
}

export type NicCallbackFunction = ((nic: Nic) => void);
