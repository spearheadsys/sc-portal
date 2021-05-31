import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { UserInfo } from '../models/user-info';
import { Observable } from 'rxjs';
import { UserKey } from '../models/user-key';

@Injectable({
  providedIn: 'root'
})
export class AccountService
{
  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly httpClient: HttpClient) { }

  // ----------------------------------------------------------------------------------------------------------------
  getUserInfo(): Observable<UserInfo>
  {
    return this.httpClient.get<UserInfo>(`/api/my`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  updateAccount(userInfo: UserInfo): Observable<UserInfo>
  {
    return this.httpClient.post<UserInfo>(`/api/my`, userInfo);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getUserLimits()
  {
    return this.httpClient.get(`/api/my/limits`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getKeys(): Observable<UserKey[]>
  {
    return this.httpClient.get<UserKey[]>(`/api/my/keys`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  addKey(name: string, key: string): Observable<UserKey>
  {
    return this.httpClient.post<UserKey>(`/api/my/keys`, { name, key });
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteKey(name: string)
  {
    return this.httpClient.delete(`/api/my/keys/${name}`);
  }
}
