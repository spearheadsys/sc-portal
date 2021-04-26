import { Component, OnInit, OnDestroy, OnChanges, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CatalogService } from '../../catalog/helpers/catalog.service';
import { empty, forkJoin, Observable, of, Subject, ReplaySubject } from 'rxjs';
import { delay, first, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { InstancesService } from '../helpers/instances.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Instance } from '../models/instance';

@Component({
  selector: 'app-instance-info',
  templateUrl: './instance-info.component.html',
  styleUrls: ['./instance-info.component.scss']
})
export class InstanceInfoComponent implements OnInit, OnDestroy, OnChanges
{
  @Input()
  instance: Instance;

  @Input()
  loadInfo: boolean;

  @Output()
  processing = new EventEmitter();

  @Output()
  finishedProcessing = new EventEmitter();

  @Output()
  load = new EventEmitter();

  loading: boolean;
  
  private finishedLoading: boolean;
  private destroy$ = new Subject();
  private onChanges$ = new ReplaySubject();

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
    this.processing.emit();

    this.instancesService.toggleDeletionProtection(instance.id, event.target.checked)
      .subscribe(() =>
      {
        this.toastr.info(`The deletion protection for machine "${instance.name}" is now ${event.target.checked ? 'enabled' : 'disabled'}`);
        this.finishedProcessing.emit();
      },
        err =>
        {
          this.toastr.error(`Machine "${instance.name}" error: ${err.error.message}`);
          this.finishedProcessing.emit();
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
        this.load.emit(dnsList);
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
    this.onChanges$.pipe(takeUntil(this.destroy$)).subscribe(() =>
    {
      if (!this.finishedLoading && this.loadInfo && !this.instance?.infoLoaded)
        this.getInfo();
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnChanges(changes: SimpleChanges): void
  {
    // Since we can't control if ngOnChanges is executed before ngOnInit, we need this trick
    this.onChanges$.next(changes);
  }


  // ----------------------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    this.destroy$.next();
  }
}
