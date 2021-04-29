import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Instance } from '../models/instance';
import { delay, filter, map, repeatWhen, take, tap } from 'rxjs/operators';
import { InstanceRequest } from '../models/instance';
import { Cacheable } from 'ts-cacheable';
import { volumesCacheBuster$ } from '../../volumes/helpers/volumes.service';

const instancesCacheBuster$ = new Subject<void>();

@Injectable({
  providedIn: 'root'
})
export class InstancesService
{
  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly httpClient: HttpClient) { }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable({
    cacheBusterObserver: instancesCacheBuster$
  })
  get(): Observable<Instance[]>
  {
    return this.httpClient.get<Instance[]>(`/api/my/machines`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable({
    cacheBusterObserver: instancesCacheBuster$
  })
  getById(instanceId: string): Observable<Instance>
  {
    return this.httpClient.get<Instance>(`/api/my/machines/${instanceId}`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getInstanceUntilExpectedState(instance: Instance, expectedStates: string[], callbackFn?: InstanceCallbackFunction, maxRetries = 30): Observable<Instance>
  {
    // Keep polling the instance until it reaches the expected state
    return this.httpClient.get<Instance>(`/api/my/machines/${instance.id}`)
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
                throw { error: `Failed to retrieve the current status for machine "${instance.name}"` };

              return y;
            }));
        }),
        filter(x => expectedStates.includes(x.state)),
        take(1) //  needed to stop the repeatWhen loop
      );
  }

  // ----------------------------------------------------------------------------------------------------------------
  add(instance: InstanceRequest): Observable<Instance>
  {
    return this.httpClient.post<Instance>(`/api/my/machines`, instance)
      .pipe(tap(() =>
      {
        instancesCacheBuster$.next();

        if (instance.volumes?.length)
          volumesCacheBuster$.next();
      }));
  }

  // ----------------------------------------------------------------------------------------------------------------
  delete(instanceId: string): Observable<any>
  {
    return this.httpClient.delete(`/api/my/machines/${instanceId}`)
      .pipe(tap(() => instancesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  start(instanceId: string): Observable<Instance>
  {
    return this.httpClient.post<Instance>(`/api/my/machines/${instanceId}?action=start`, {})
      .pipe(tap(() => instancesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  stop(instanceId: string): Observable<Instance>
  {
    return this.httpClient.post<Instance>(`/api/my/machines/${instanceId}?action=stop`, {})
      .pipe(tap(() => instancesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  reboot(instanceId: string): Observable<Instance>
  {
    return this.httpClient.post<Instance>(`/api/my/machines/${instanceId}?action=reboot`, {})
      .pipe(tap(() => instancesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  resize(instanceId: string, packageId: string): Observable<any>
  {
    return this.httpClient.post(`/api/my/machines/${instanceId}?action=resize&package=${packageId}`, {})
      .pipe(tap(() => instancesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  rename(instanceId: string, name: string): Observable<Instance>
  {
    if (!name)
      throw 'Name cannot be empty';

    return this.httpClient.post<Instance>(`/api/my/machines/${instanceId}?action=rename&name=${name}`, {})
      .pipe(tap(() => instancesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  toggleFirewall(instanceId: string, enable: boolean): Observable<any>
  {
    return this.httpClient.post(`/api/my/machines/${instanceId}?action=${enable ? 'enable' : 'disable'}_firewall`, {});
  }

  // ----------------------------------------------------------------------------------------------------------------
  toggleDeletionProtection(instanceId: string, enable: boolean): Observable<any>
  {
    return this.httpClient.post(`/api/my/machines/${instanceId}?action=${enable ? 'enable' : 'disable'}_deletion_protection`, {});
  }

  // ----------------------------------------------------------------------------------------------------------------
  getTags(instanceId: string): Observable<any>
  {
    return this.httpClient.get(`/api/my/machines/${instanceId}/tags`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getTag(instanceId: string, key: string): Observable<any>
  {
    return this.httpClient.get(`/api/my/machines/${instanceId}/tags/${key}`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  addTags(instanceId: string, tags: any): Observable<any>
  {
    return this.httpClient.post(`/api/my/machines/${instanceId}/tags`, tags);
  }

  // ----------------------------------------------------------------------------------------------------------------
  replaceTags(instanceId: string, tags: any): Observable<any>
  {
    return this.httpClient.put(`/api/my/machines/${instanceId}/tags`, tags);
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteAllTags(instanceId: string): Observable<any>
  {
    return this.httpClient.delete(`/api/my/machines/${instanceId}/tags`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteTag(instanceId: string, key: string): Observable<any>
  {
    return this.httpClient.delete(`/api/my/machines/${instanceId}/tags/${key}`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getMetadata(instanceId: string): Observable<any>
  {
    return this.httpClient.get(`/api/my/machines/${instanceId}/metadata`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getMetadataValue(instanceId: string, key: string): Observable<any>
  {
    return this.httpClient.get(`/api/my/machines/${instanceId}/metadata/${key}`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  addMetadata(instanceId: string, metadata: any): Observable<any>
  {
    return this.httpClient.post(`/api/my/machines/${instanceId}/metadata`, metadata);
  }

  // ----------------------------------------------------------------------------------------------------------------
  replaceMetadata(instanceId: string, metadata: any): Observable<any>
  {
    return this.httpClient.put(`/api/my/machines/${instanceId}/metadata`, metadata);
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteAllMetadata(instanceId: string): Observable<any>
  {
    return this.httpClient.delete(`/api/my/machines/${instanceId}/metadata`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteMetadata(instanceId: string, key: string): Observable<any>
  {
    return this.httpClient.delete(`/api/my/machines/${instanceId}/metadata/${key}`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getAudit(instanceId: string): Observable<any>
  {
    return this.httpClient.get(`/api/my/machines/${instanceId}/audit`);
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
}

export type InstanceCallbackFunction = ((instance: Instance) => void);
