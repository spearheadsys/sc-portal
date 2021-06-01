import { Component, OnInit, OnDestroy, OnChanges, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CatalogService } from '../../catalog/helpers/catalog.service';
import { empty, forkJoin, Observable, of, Subject, ReplaySubject } from 'rxjs';
import { delay, first, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { MachinesService } from '../helpers/machines.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Machine } from '../models/machine';

@Component({
  selector: 'app-machine-info',
  templateUrl: './machine-info.component.html',
  styleUrls: ['./machine-info.component.scss']
})
export class MachineInfoComponent implements OnInit, OnDestroy, OnChanges
{
  @Input()
  machine: Machine;

  @Input()
  loadInfo: boolean;

  @Input()
  refresh: boolean;

  @Output()
  processing = new EventEmitter();

  @Output()
  finishedProcessing = new EventEmitter();

  @Output()
  load = new EventEmitter();

  loading: boolean;
  dnsCount: number;

  private finishedLoading: boolean;
  private destroy$ = new Subject();
  private onChanges$ = new ReplaySubject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly machinesService: MachinesService,
    private readonly catalogService: CatalogService,
    private readonly modalService: BsModalService,
    private readonly toastr: ToastrService)
  {
  }

  // ----------------------------------------------------------------------------------------------------------------
  toggleDeletionProtection(event, machine: Machine)
  {
    this.processing.emit();

    this.machinesService.toggleDeletionProtection(machine.id, event.target.checked)
      .subscribe(() =>
      {
        this.toastr.info(`The deletion protection for machine "${machine.name}" is now ${event.target.checked ? 'enabled' : 'disabled'}`);
        this.finishedProcessing.emit();
      },
        err =>
        {
          this.toastr.error(`Machine "${machine.name}" error: ${err.error.message}`);
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
    if (this.finishedLoading || this.machine.state === 'provisioning') return;

    this.loading = true;

    if (this.refresh)
      this.machinesService.clearCache();

    this.machinesService.getById(this.machine.id)
      .subscribe(x =>
      {
        const dnsList = {};
        for (const dns of x.dns_names.sort((a, b) => b.localeCompare(a)))
          dnsList[dns] = this.getParsedDns(dns);

        this.dnsCount = Object.keys(dnsList).length;

        this.machine.dnsList = dnsList;

        this.loading = false;
        this.finishedLoading = true;
        this.load.emit(dnsList);
      },
        err =>
        {
          const errorDetails = err.error?.message ? `(${err.error.message})` : '';
          this.toastr.error(`Couldn't load details for machine "${this.machine.name}" ${errorDetails}`);
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
      if (this.refresh)
      {
        this.finishedLoading = false;
        this.loadInfo = true;
      }

      if (!this.finishedLoading && this.loadInfo && !this.machine?.infoLoaded || this.refresh)
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
