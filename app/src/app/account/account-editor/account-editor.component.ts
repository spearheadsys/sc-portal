import { Component, OnInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';
import { NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../helpers/auth.service';
import { UserInfo } from '../models/user-info';
import { AccountService } from '../helpers/account.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-account-editor',
  templateUrl: './account-editor.component.html',
  styleUrls: ['./account-editor.component.scss']
})
export class AccountEditorComponent implements OnInit
{
  save = new Subject<any>();
  loading: boolean;
  working: boolean;
  editorForm: FormGroup;

  private destroy$ = new Subject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly modalRef: BsModalRef,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly accountService: AccountService,
    private readonly toastr: ToastrService)
  {    // When the user navigates away from this route, hide the modal
    router.events
      .pipe(
        takeUntil(this.destroy$),
        filter(e => e instanceof NavigationStart)
      )
      .subscribe(() => this.modalRef.hide());

    authService.userInfoUpdated$.subscribe(this.createForm.bind(this));
  }

  // ----------------------------------------------------------------------------------------------------------------
  private createForm(userInfo: UserInfo)
  {
    this.editorForm = this.fb.group(
      {
        id: [userInfo.id],
        firstName: [userInfo.firstName],
        lastName: [userInfo.lastName],
        companyName: [userInfo.companyName],
        // address: [userInfo.address],
        // postalCode: [userInfo.postalCode],
        // city: [userInfo.city],
        // state: [userInfo.state],
        // country: [userInfo.country],
        email: [userInfo.email],
        phone: [userInfo.phone],
        cns: [userInfo.triton_cns_enabled]
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  close(response?: any)
  {
    this.save.next(response);
    this.modalRef.hide();
  }

  // ----------------------------------------------------------------------------------------------------------------
  saveChanges()
  {
    this.working = true;

    const changes = this.editorForm.getRawValue();

    const userInfo = new UserInfo();
    Object.assign(userInfo, changes);
    userInfo.triton_cns_enabled = changes.cns;

    this.accountService.updateAccount(userInfo)
      .subscribe(response =>
      {
        this.authService.userInfo = response;

        this.close(response);

        this.working = false;
      }, err =>
        {
          this.toastr.error(err.error.message);
          this.working = false;
        });
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
  }
}
