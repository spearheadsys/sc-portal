import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent implements OnInit, OnDestroy
{
  @Input()
  title = 'Confirmation';

  @Input()
  prompt: string;

  @Input()
  confirmButtonText = 'Yes';

  @Input()
  declineButtonText = 'No';

  @Input()
  confirmByDefault = true;

  confirm = new Subject();

  private destroy$ = new Subject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly modalRef: BsModalRef,
    private readonly router: Router)
  {    // When the user navigates away from this route, hide the modal
    router.events
      .pipe(
        takeUntil(this.destroy$),
        filter(e => e instanceof NavigationStart)
      )
      .subscribe(() => this.modalRef.hide());
  }

  // ----------------------------------------------------------------------------------------------------------------
  declineAction()
  {
    this.modalRef.hide();
  }

  // ----------------------------------------------------------------------------------------------------------------
  confirmAction()
  {
    this.confirm.next();
    this.modalRef.hide();
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit()
  {
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    this.destroy$.next();
  }
}
