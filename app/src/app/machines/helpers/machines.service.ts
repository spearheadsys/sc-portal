import { Injectable } from '@angular/core';
import { forkJoin, from, Observable, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Machine } from '../models/machine';
import { concatMap, delay, filter, map, repeatWhen, take, tap } from 'rxjs/operators';
import { MachineRequest } from '../models/machine';
import { Cacheable } from 'ts-cacheable';
import { volumesCacheBuster$ } from '../../volumes/helpers/volumes.service';

const machinesCacheBuster$ = new Subject<void>();

@Injectable({
  providedIn: 'root'
})
export class MachinesService
{
  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly httpClient: HttpClient) { }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable({
    cacheBusterObserver: machinesCacheBuster$
  })
  get(): Observable<Machine[]>
  {
    return this.httpClient.get<Machine[]>(`/api/my/machines`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable({
    cacheBusterObserver: machinesCacheBuster$
  })
  getById(machineId: string): Observable<Machine>
  {
    return this.httpClient.get<Machine>(`/api/my/machines/${machineId}`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getMachineUntilExpectedState(machine: Machine, expectedStates: string[], callbackFn?: MachineCallbackFunction, maxRetries = 30): Observable<Machine>
  {
    // Keep polling the machine until it reaches the expected state
    return this.httpClient.get<Machine>(`/api/my/machines/${machine.id}`)
      .pipe(
        tap(x => callbackFn && callbackFn(x)),
        repeatWhen(x =>
        {
          let retries = 0;

          return x.pipe(
            delay(3000),
            map(y =>
            {
              if (retries++ === maxRetries)
                throw { error: `Failed to retrieve the current status for machine "${machine.name}"` };

              return y;
            }));
        }),
        filter(x => expectedStates.includes(x.state)),
        take(1) //  needed to stop the repeatWhen loop
      );
  }

  // ----------------------------------------------------------------------------------------------------------------
  getMachineUntilNicRemoved(machine: any, networkName: string, callbackFn?: MachineCallbackFunction, maxRetries = 30): Observable<Machine>
  {
    networkName = networkName.toLocaleLowerCase();

    // Keep polling the machine until it reaches the expected state
    return this.httpClient.get<Machine>(`/api/my/machines/${machine.id}`)
          .pipe(
            tap(machine => callbackFn && callbackFn(machine)),
            repeatWhen(x =>
            {
              let retries = 0;
    
              return x.pipe(
                delay(3000),
                map(() =>
                {
                  if (retries++ === maxRetries)
                    throw { error: `Failed to retrieve the current status for machine "${machine.name}"` };
                })
              );
            }),
            filter(x => x.state === 'running' && !x.dns_names.some(d => d.toLocaleLowerCase().indexOf(networkName) >= 0)),
            take(1), //  needed to stop the repeatWhen loop
            map(x => 
            {             
              if (callbackFn)
                callbackFn(x);

              return machine;
            })
          );
  }

  // ----------------------------------------------------------------------------------------------------------------
  add(machine: MachineRequest): Observable<Machine>
  {
    return this.httpClient.post<Machine>(`/api/my/machines`, machine)
      .pipe(tap(() =>
      {
        machinesCacheBuster$.next();

        if (machine.volumes?.length)
          volumesCacheBuster$.next();
      }));
  }

  // ----------------------------------------------------------------------------------------------------------------
  delete(machineId: string): Observable<any>
  {
    return this.httpClient.delete(`/api/my/machines/${machineId}`)
      .pipe(tap(() => machinesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  start(machineId: string): Observable<Machine>
  {
    return this.httpClient.post<Machine>(`/api/my/machines/${machineId}?action=start`, {})
      .pipe(tap(() => machinesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  stop(machineId: string): Observable<Machine>
  {
    return this.httpClient.post<Machine>(`/api/my/machines/${machineId}?action=stop`, {})
      .pipe(tap(() => machinesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  reboot(machineId: string): Observable<Machine>
  {
    return this.httpClient.post<Machine>(`/api/my/machines/${machineId}?action=reboot`, {})
      .pipe(tap(() => machinesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  resize(machineId: string, packageId: string): Observable<any>
  {
    return this.httpClient.post(`/api/my/machines/${machineId}?action=resize&package=${packageId}`, {})
      .pipe(tap(() => machinesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  rename(machineId: string, name: string): Observable<Machine>
  {
    if (!name)
      throw 'Name cannot be empty';

    return this.httpClient.post<Machine>(`/api/my/machines/${machineId}?action=rename&name=${name}`, {})
      .pipe(tap(() => machinesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  toggleFirewall(machineId: string, enable: boolean): Observable<any>
  {
    return this.httpClient.post(`/api/my/machines/${machineId}?action=${enable ? 'enable' : 'disable'}_firewall`, {});
  }

  // ----------------------------------------------------------------------------------------------------------------
  toggleDeletionProtection(machineId: string, enable: boolean): Observable<any>
  {
    return this.httpClient.post(`/api/my/machines/${machineId}?action=${enable ? 'enable' : 'disable'}_deletion_protection`, {});
  }

  // ----------------------------------------------------------------------------------------------------------------
  getTags(machineId: string): Observable<any>
  {
    return this.httpClient.get(`/api/my/machines/${machineId}/tags`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getTag(machineId: string, key: string): Observable<any>
  {
    return this.httpClient.get(`/api/my/machines/${machineId}/tags/${key}`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  addTags(machineId: string, tags: any): Observable<any>
  {
    return this.httpClient.post(`/api/my/machines/${machineId}/tags`, tags);
  }

  // ----------------------------------------------------------------------------------------------------------------
  replaceTags(machineId: string, tags: any): Observable<any>
  {
    return this.httpClient.put(`/api/my/machines/${machineId}/tags`, tags);
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteAllTags(machineId: string): Observable<any>
  {
    return this.httpClient.delete(`/api/my/machines/${machineId}/tags`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteTag(machineId: string, key: string): Observable<any>
  {
    return this.httpClient.delete(`/api/my/machines/${machineId}/tags/${key}`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getMetadata(machineId: string): Observable<any>
  {
    return this.httpClient.get(`/api/my/machines/${machineId}/metadata`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getMetadataValue(machineId: string, key: string): Observable<any>
  {
    return this.httpClient.get(`/api/my/machines/${machineId}/metadata/${key}`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  replaceMetadata(machineId: string, metadata: any): Observable<any>
  {
    // First retrieve current metadata
    return this.httpClient.get(`/api/my/machines/${machineId}/metadata`)
      .pipe(concatMap(existingMetadata =>
      {
        // Compute which metadata the user chose to remove
        const obsoleteMetadata: Observable<any>[] = [];
        for (const key of Object.keys(existingMetadata))
          if (!metadata.hasOwnProperty(key) && key !== 'root_authorized_keys') // root_authorized_keys is readonly
            obsoleteMetadata.push(this.httpClient.delete(`/api/my/machines/${machineId}/metadata/${key}`));

        // Any metadata keys passed in here are created if they do not exist, and overwritten if they do.
        const metadataToUpsert = this.httpClient.post(`/api/my/machines/${machineId}/metadata`, metadata);

        if (obsoleteMetadata.length)
        {
          // In multiple concurrent requests delete the obsolete metadata, then upsert the remaining ones
          return forkJoin(obsoleteMetadata).pipe(concatMap(() => metadataToUpsert.pipe(map(() => metadata))));
        }
        else
          return metadataToUpsert;
      }));
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteAllMetadata(machineId: string): Observable<any>
  {
    return this.httpClient.delete(`/api/my/machines/${machineId}/metadata`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getAudit(machineId: string): Observable<any>
  {
    return this.httpClient.get(`/api/my/machines/${machineId}/audit`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable()
  getImagesRates(): Observable<any>
  {
    return this.httpClient.get(`./assets/data/images.json`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable()
  getPackagesRates(): Observable<any>
  {
    return this.httpClient.get(`./assets/data/packages.json`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  clearCache()
  {
    machinesCacheBuster$.next();
  }
}

export type MachineCallbackFunction = ((machine: Machine) => void);
