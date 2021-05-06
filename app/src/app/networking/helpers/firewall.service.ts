import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { delay, filter, first, flatMap, map, mergeMapTo, repeatWhen, switchMap, switchMapTo, take, takeUntil, tap } from 'rxjs/operators';
import { concat, empty, of, range, throwError, zip } from 'rxjs';
import { Cacheable } from 'ts-cacheable';
import { FirewallRuleResponse } from '../models/firewall-rule';
import { FirewallRule } from '../models/firewall-rule';
import { FirewallRuleRequest } from '../models/firewall-rule';

const cacheBuster$ = new Subject<void>();

@Injectable({
  providedIn: 'root'
})
export class FirewallService
{
  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly httpClient: HttpClient) { }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable({
    cacheBusterObserver: cacheBuster$
  })
  getFirewallRules(): Observable<FirewallRuleResponse[]>
  {
    return this.httpClient.get<FirewallRuleResponse[]>(`/api/my/fwrules`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable({
    cacheBusterObserver: cacheBuster$
  })
  getInstanceFirewallRules(instanceId: string): Observable<FirewallRuleResponse[]>
  {
    return this.httpClient.get<FirewallRuleResponse[]>(`/api/my/machines/${instanceId}/fwrules`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  addFirewallRule(firewallRule: FirewallRuleRequest): Observable<FirewallRuleResponse>
  {
    return this.httpClient.post<FirewallRuleResponse>(`/api/my/fwrules`, firewallRule)
      .pipe(tap(() => cacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  editFirewallRule(firewallRuleId: string, firewallRule: FirewallRuleRequest): Observable<FirewallRuleResponse>
  {
    return this.httpClient.post<FirewallRuleResponse>(`/api/my/fwrules/${firewallRuleId}`, firewallRule)
      .pipe(tap(() => cacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  toggleFirewallRule(firewallRule: FirewallRuleResponse, enable: boolean): Observable<FirewallRuleResponse>
  {
    return this.httpClient.post<any>(`/api/my/fwrules/${firewallRule.id}/${enable ? 'enable' : 'disable'}`, {})
      .pipe(tap(() => cacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteFirewallRule(firewallRule: FirewallRuleResponse): Observable<any>
  {
    return this.httpClient.delete(`/api/my/fwrules/${firewallRule.id}`)
      .pipe(tap(() => cacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  parseFirewallRule(firewallRule: FirewallRuleResponse): FirewallRule
  {
    let ruleAction = ' ALLOW ';
    let indexOfAction = firewallRule.rule.indexOf(ruleAction);
    if (indexOfAction < 0)
    {
      ruleAction = ' BLOCK ';
      indexOfAction = firewallRule.rule.indexOf(ruleAction);
    }

    const indexOfTo = firewallRule.rule.indexOf(' TO ');

    const from = firewallRule.rule.substring('FROM '.length, indexOfTo).replace('(', '').replace(')', '').split(' OR ');
    const fromArray = from.map(x =>
    {
      const parts = x.split(' ');

      return {
        type: parts[0],
        config: x.substr(parts[0].length + 1)
      }
    });

    const to = firewallRule.rule.substring(indexOfTo + ' TO '.length, indexOfAction).replace('(', '').replace(')', '').split(' OR ');
    const toArray = to.map(x =>
    {
      const parts = x.split(' ');

      return {
        type: parts[0],
        config: x.substr(parts[0].length + 1).replace(/"/g, '').replace(/ = /g, ':')
      }
    });

    const protocolAndPortOrCode = firewallRule.rule.substr(indexOfAction + ruleAction.length).split(' ');

    const rule = new FirewallRule();
    Object.assign(rule, firewallRule);

    rule.fromArray = fromArray;
    rule.fromValue = from.join(',');
    rule.toArray = toArray;
    rule.toValue = to.join(',').replace(/"/g, '').replace(/ = /g, ':');
    rule.action = ruleAction.trim();
    rule.protocol = protocolAndPortOrCode[0];
    rule.protocolConfig = protocolAndPortOrCode[2] + (protocolAndPortOrCode.length > 3 ? `:${protocolAndPortOrCode[4]}` : '');
    rule.rule = `${rule.action} ${rule.protocol} ${rule.protocolConfig} FROM ${rule.fromValue} TO ${rule.toValue}`.toUpperCase();

    return rule;
  }

  // ----------------------------------------------------------------------------------------------------------------
  stringifyFirewallRule(firewallRule: FirewallRule): string
  {
    const protocolConfigParts = firewallRule.protocolConfig.split(':');
    const protocolConfig = firewallRule.protocol.toUpperCase() === 'ICMP'
      ? `TYPE ${protocolConfigParts[0]} CODE ${protocolConfigParts[1]}`
      : `PORT ${protocolConfigParts[0]}`;

    let from = '', to = '';

    if (firewallRule.fromArray)
    {
      const fromArray = firewallRule.fromArray.map(x => `${x.type} ${x.config}`);
      from = `${fromArray.length > 1 ? `(${fromArray.join(' OR ')})` : fromArray[0]}`;
    }

    if (firewallRule.toArray)
    {
      const toArray = firewallRule.toArray.map(x => `${x.type} ${x.config}`);
      to = `${toArray.length > 1 ? `(${toArray.join(' OR ')})` : toArray[0]}`;
    }

    if (!from || !to)
      return '';

    return `FROM ${from} TO ${to} ${firewallRule.action.toUpperCase()} ${firewallRule.protocol.toUpperCase()} ${protocolConfig}`;
  }
}
