import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';
import { NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { AccountService } from '../helpers/account.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-ssh-key-editor',
  templateUrl: './ssh-key-editor.component.html',
  styleUrls: ['./ssh-key-editor.component.scss']
})
export class SshKeyEditorComponent implements OnInit, OnDestroy
{
  save = new Subject<any>();
  editorForm: FormGroup;

  private destroy$ = new Subject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly accountService: AccountService,
    private readonly modalRef: BsModalRef,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly toastr: ToastrService)
  {    // When the user navigates away from this route, hide the modal
    router.events
      .pipe(
        takeUntil(this.destroy$),
        filter(e => e instanceof NavigationStart)
      )
      .subscribe(() => this.modalRef.hide());
  }

  // ----------------------------------------------------------------------------------------------------------------
  private createForm()
  {
    this.editorForm = this.fb.group(
      {
        name: [null, Validators.required],
        key: [null, Validators.required]
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  close()
  {
    this.modalRef.hide();
  }

  // ----------------------------------------------------------------------------------------------------------------
  saveChanges()
  {
    const sshKey = this.editorForm.getRawValue();

    this.accountService.addKey(sshKey.name, sshKey.key)
      .subscribe(response =>
      {
        this.save.next(response);

        this.modalRef.hide();
      },
        err =>
        {
          this.toastr.error(err.error.message);
        });
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit()
  {
    this.createForm();
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    this.destroy$.next();
  }
}
