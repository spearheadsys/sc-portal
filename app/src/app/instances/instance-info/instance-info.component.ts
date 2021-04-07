import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CatalogService } from '../../catalog/helpers/catalog.service';
import { empty, forkJoin, Observable, of, Subject } from 'rxjs';
import { delay, first, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { InstancesService } from '../helpers/instances.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Instance } from '../models/instance';

@Component({
  selector: 'app-instance-info',
  templateUrl: './instance-info.component.html',
  styleUrls: ['./instance-info.component.scss']
})
export class InstanceInfoComponent implements OnInit, OnDestroy
{
  @Input()
  instance: Instance;

  @Input()
  set loadInfo(value: boolean)
  {
    if (!this.finishedLoading && value && this.instance)
      this.getInfo();
  }

  @Output()
  beforeLoad = new EventEmitter();

  @Output()
  load = new EventEmitter();

  loading: boolean;
  
  private finishedLoading: boolean;
  private destroy$ = new Subject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly instancesService: InstancesService,
    private readonly catalogService: CatalogService,
    private readonly modalService: BsModalService,
    private readonly toastr: ToastrService)
  {
  }

  // ----------------------------------------------------------------------------------------------------------------
  toggleDeletionProtection(event, instance: Instance)
  {
    this.beforeLoad.emit();

    this.instancesService.toggleDeletionProtection(instance.id, event.target.checked)
      .subscribe(() =>
      {
        this.toastr.info(`The deletion protection for machine "${instance.name}" is now ${event.target.checked ? 'enabled' : 'disabled'}`);
        this.load.emit();
      },
        err =>
        {
          this.toastr.error(`Machine "${instance.name}" error: ${err.error.message}`);
          this.load.emit();
        });
  }

  // ----------------------------------------------------------------------------------------------------------------
  dnsCopied(event)
  {
    this.toastr.info('The DNS address has been copied to the clipboard');
  }

  // ----------------------------------------------------------------------------------------------------------------
  private getInfo()
  {
    if (this.finishedLoading) return;

    this.loading = true;

    this.instancesService.getById(this.instance.id)
      .subscribe(x =>
      {
        const dnsList = {};
        for (const dns of x.dns_names.sort((a, b) => b.localeCompare(a)))
          dnsList[dns] = this.getParsedDns(dns);

        this.instance.dnsList = dnsList;

        this.loading = false;
        this.finishedLoading = true;
      },
        err =>
        {
          const errorDetails = err.error?.message ? `(${err.error.message})` : '';
          this.toastr.error(`Couldn't load details for machine "${this.instance.name}" ${errorDetails}`);
          this.loading = false;
        });
  }

  // ----------------------------------------------------------------------------------------------------------------
  private getParsedDns(dnsName: string): string[]
  {
    const dns = dnsName.toLowerCase();

    const a = dns.split('.on.spearhead.cloud');
    const b = a[0].split('.inst.');
    const c = b[0].split('.');

    return [c[0], c.length > 1 ? c[1] : '', `inst.${b[1]}.on.spearhead.cloud`];
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    this.destroy$.next();
  }
}
