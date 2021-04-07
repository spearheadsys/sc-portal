import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { Instance } from '../models/instance';
import { InstancesService } from '../helpers/instances.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-instance-history',
  templateUrl: './instance-history.component.html',
  styleUrls: ['./instance-history.component.scss']
})
export class InstanceHistoryComponent implements OnInit, OnDestroy
{
  @Input()
  instance: Instance;

  loading: boolean;
  history: any[];

  private destroy$ = new Subject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly modalRef: BsModalRef,
    private readonly router: Router,
    private readonly instancesService: InstancesService,
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

    this.instancesService.getAudit(this.instance.id)
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
