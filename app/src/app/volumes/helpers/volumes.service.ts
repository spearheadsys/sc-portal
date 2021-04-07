import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { delay, filter, first, flatMap, map, mergeMapTo, repeatWhen, switchMap, switchMapTo, take, takeUntil, tap } from 'rxjs/operators';
import { concat, empty, of, range, throwError, zip } from 'rxjs';
import { Cacheable } from 'ts-cacheable';
import { VolumeResponse } from '../models/volume';
import { VolumeRequest } from '../models/volume';

export const volumesCacheBuster$ = new Subject<void>();

@Injectable({
  providedIn: 'root'
})
export class VolumesService
{
  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly httpClient: HttpClient) { }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable({
    cacheBusterObserver: volumesCacheBuster$
  })
  getVolumes(): Observable<VolumeResponse[]>
  {
    return this.httpClient.get<VolumeResponse[]>(`/api/my/volumes`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable({
    cacheBusterObserver: volumesCacheBuster$
  })
  getVolume(volumeId: string): Observable<VolumeResponse>
  {
    return this.httpClient.get<VolumeResponse>(`/api/my/volumes/${volumeId}`);
  }

  //// ----------------------------------------------------------------------------------------------------------------
  //@Cacheable({
  //  cacheBusterObserver: volumesCacheBuster$
  //})
  //getInstanceVolumes(instanceId: string): Observable<VolumeResponse[]>
  //{
  //  return this.httpClient.get<VolumeResponse[]>(`/api/my/machines/${instanceId}/volumes`);
  //}

  // ----------------------------------------------------------------------------------------------------------------
  addVolume(volume: VolumeRequest): Observable<VolumeResponse>
  {
    return this.httpClient.post<VolumeResponse>(`/api/my/volumes`, volume)
      .pipe(tap(() => volumesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  // Renaming a volume is not allowed for volumes that are referenced by active VMs. => check "refs" array property
  renameVolume(volumeId: string, name: string): Observable<VolumeResponse>
  {
    return this.httpClient.post<VolumeResponse>(`/api/my/volumes/${volumeId}`, { name })
      .pipe(tap(() => volumesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteVolume(volume: VolumeResponse): Observable<any>
  {
    return this.httpClient.delete(`/api/my/volumes/${volume.id}`)
      .pipe(tap(() => volumesCacheBuster$.next()));
  }
}
