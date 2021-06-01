import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { Machine } from '../models/machine';
import { MachinesService } from '../helpers/machines.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-machine-history',
  templateUrl: './machine-history.component.html',
  styleUrls: ['./machine-history.component.scss']
})
export class MachineHistoryComponent implements OnInit, OnDestroy
{
  @Input()
  machine: Machine;

  loading: boolean;
  history: any[];

  private destroy$ = new Subject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly modalRef: BsModalRef,
    private readonly router: Router,
    private readonly machinesService: MachinesService,
    private readonly toastr: ToastrService)
  {
    // When the user navigates away from this route, hide the modal
    router.events
      .pipe(
        takeUntil(this.destroy$),
        filter(e => e instanceof NavigationStart)
      )
      .subscribe(() => this.modalRef.hide());
  }

  // ----------------------------------------------------------------------------------------------------------------
  close()
  {
    this.modalRef.hide();
  }

  // ----------------------------------------------------------------------------------------------------------------
  private getHistory()
  {
    this.loading = true;

    this.machinesService.getAudit(this.machine.id)
      .subscribe(x =>
      {
        this.history = x;

        this.loading = false;
      }, err =>
      {
        this.toastr.error(err.error.message);
        this.loading = false;
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
    this.getHistory();
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    this.destroy$.next();
  }
}
