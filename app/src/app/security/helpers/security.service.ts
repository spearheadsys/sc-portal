import { Injectable } from '@angular/core';
import { delay, filter, first, flatMap, map, mergeMapTo, repeatWhen, switchMap, switchMapTo, take, takeUntil, tap } from 'rxjs/operators';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { User, UserRequest } from '../models/user';
import { Role } from '../models/role';
import { Policy } from '../models/policy';
import { Cacheable } from 'ts-cacheable';
import { PolicyRequest } from '../models/policy';
import { RolePolicy } from '../models/role-policy';
import { RoleUser } from '../models/role-user';
import { UserResponse } from '../models/user';

const usersCacheBuster$ = new Subject<void>();
const rolesCacheBuster$ = new Subject<void>();

@Injectable({
  providedIn: 'root'
})
export class SecurityService
{
  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly httpClient: HttpClient) { }

  // ----------------------------------------------------------------------------------------------------------------
  // These are users (also known as sub-users); additional users who are authorized to use the same account,
  // but are subject to the RBAC system.
  @Cacheable({
    cacheBusterObserver: usersCacheBuster$
  })
  getUsers(): Observable<UserResponse[]>
  {
    return this.httpClient.get<UserResponse[]>(`/api/my/users`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  addUser(user: UserRequest): Observable<UserResponse>
  {
    return this.httpClient.post<UserResponse>(`/api/my/users`, user)
      .pipe(tap(() => usersCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  editUser(userId: string, user: UserRequest): Observable<UserResponse>
  {
    return this.httpClient.post<UserResponse>(`/api/my/users/${userId}`, user)
      .pipe(tap(() => usersCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  setUserRoles(user: User, roles: Role[])
  {
    const observables: Observable<Role>[] = [];

    for (const role of roles)
    {
      const members: RoleUser[] = [];

      const member = new RoleUser();
      member.id = user.id;
      member.login = user.login;
      member.type = 'subuser';
      member.default = !members.length;

      members.push(member);

      observables.push(this.httpClient.post<Role>(`/api/my/roles/${role.id}`, { name: role.name, members }));
    }

    return forkJoin(observables).pipe(tap(() => rolesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  addRoleToUser(role: Role, roleUser?: RoleUser): Observable<Role>
  {
    const members = role.members ? [...role.members] : [];

    if (roleUser)
    {
      const index = members.findIndex(m => m.id === roleUser.id);
      if (index >= 0)
        return of(role);

      members.push(roleUser);
    }

    return this.httpClient.post<Role>(`/api/my/roles/${role.id}`, { name: role.name, members })
      .pipe(tap(() => rolesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  removeRoleFromUser(role: Role, userId: string): Observable<Role>
  {
    if (!role.members)
      return of(role);

    const members = [...role.members];
    const index = members.findIndex(r => r.id === userId);
    if (index < 0)
      return of(role);

    members.splice(index, 1);

    return this.httpClient.post<Role>(`/api/my/roles/${role.id}`, { name: role.name, members })
      .pipe(tap(() => rolesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  changeUserPassword(userId: string, password: string, passwordConfirmation: string): Observable<UserResponse>
  {
    return this.httpClient.post<UserResponse>(`/api/my/users/${userId}`,
      { password, password_confirmation: passwordConfirmation });
  }

  // ----------------------------------------------------------------------------------------------------------------
  removeUser(user: User)
  {
    return this.httpClient.delete(`/api/my/users/${user.id}`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  // Roles a sub-users can adopt when attempting to access a resource.
  @Cacheable({
    cacheBusterObserver: rolesCacheBuster$
  })
  getRoles(): Observable<Role[]>
  {
    return this.httpClient.get<Role[]>(`/api/my/roles`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable({
    cacheBusterObserver: rolesCacheBuster$
  })
  getRole(roleId: string): Observable<Role>
  {
    return this.httpClient.get<Role>(`/api/my/roles/${roleId}`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getRoleUntil(role: Role, conditionFn: RoleCallbackFunction, callbackFn?: RoleCallbackFunction, maxRetries = 30): Observable<Role>
  {
    if (!conditionFn)
      return of(role);

    // Keep polling the role until the expected condition is met
    return this.httpClient.get<Role>(`/api/my/roles/${role.id}`)
      .pipe(
        tap(x => callbackFn && callbackFn(x)),
        repeatWhen(x =>
        {
          let retries = 0;

          return x.pipe(
            delay(3000),
            map(() =>
            {
              if (retries++ === maxRetries)
                throw { error: { message: `Failed to retrieve the current status for role "${role.name}"` } };
            })
          );
        }),
        filter((x: Role) => conditionFn(x)),
        take(1) //  needed to stop the repeatWhen loop
      );
  }

  // ----------------------------------------------------------------------------------------------------------------
  addRole(name: string): Observable<Role>
  {
    return this.httpClient.post<Role>(`/api/my/roles`, { name })
      .pipe(tap(() => rolesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  editRole(roleId: string, name: string): Observable<Role>
  {
    return this.httpClient.post<Role>(`/api/my/roles/${roleId}`, { name })
      .pipe(tap(() => rolesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  setRolePolicies(role: Role, policies: RolePolicy[]): Observable<Role>
  {
    return this.httpClient.post<Role>(`/api/my/roles/${role.id}`, { name: role.name, policies })
      .pipe(tap(() => rolesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  addPolicyToRole(role: Role, rolePolicy?: RolePolicy): Observable<Role>
  {
    const policies = role.policies ? [...role.policies] : [];

    if (rolePolicy)
    {
      const index = policies.findIndex(r => r.id === rolePolicy.id);
      if (index >= 0)
        return of(role);

      policies.push(rolePolicy);
    }

    return this.httpClient.post<Role>(`/api/my/roles/${role.id}`, { name: role.name, policies })
      .pipe(tap(() => rolesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  removePolicyFromRole(policyId: string, role: Role): Observable<Role>
  {
    if (!role.policies)
      return of(role);

    const policies = [...role.policies];
    const index = policies.findIndex(r => r.id === policyId);
    if (index < 0)
      return of(role);

    policies.splice(index, 1);

    return this.httpClient.post<Role>(`/api/my/roles/${role.id}`, { name: role.name, policies })
      .pipe(tap(() => rolesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  removeRole(role: Role)
  {
    return this.httpClient.delete(`/api/my/roles/${role.id}`)
      .pipe(tap(() => rolesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  // Policies a sub-user can adopt when attempting to access a resource.
  getPolicies(): Observable<Policy[]>
  {
    return this.httpClient.get<Policy[]>(`/api/my/policies`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  addPolicy(policy: PolicyRequest): Observable<Policy>
  {
    return this.httpClient.post<Policy>(`/api/my/policies`, policy);
  }

  // ----------------------------------------------------------------------------------------------------------------
  editPolicy(policyId: string, policy: PolicyRequest): Observable<Policy>
  {
    return this.httpClient.post<Policy>(`/api/my/policies/${policyId}`, policy);
  }

  // ----------------------------------------------------------------------------------------------------------------
  removePolicy(policy: Policy)
  {
    return this.httpClient.delete(`/api/my/policies/${policy.id}`);
  }
}

export type RoleCallbackFunction = ((role: Role) => boolean);
