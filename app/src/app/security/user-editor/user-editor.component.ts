import { Component, Input, OnInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray, ValidatorFn, ValidationErrors } from '@angular/forms';
import { NavigationStart, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { User } from '../models/user';
import { SecurityService } from '../helpers/security.service';
import { UserRequest } from '../models/user';
import { UserResponse } from '../models/user';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-user-editor',
  templateUrl: './user-editor.component.html',
  styleUrls: ['./user-editor.component.scss']
})
export class UserEditorComponent implements OnInit {
  @Input()
  user: User;

  @Input()
  changePassword: boolean;

  save = new Subject<User>();
  loading: boolean;
  working: boolean;
  editorForm: FormGroup;

  private destroy$ = new Subject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly modalRef: BsModalRef,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly securityService: SecurityService,
    private readonly toastr: ToastrService) {    // When the user navigates away from this route, hide the modal
    router.events
      .pipe(
        takeUntil(this.destroy$),
        filter(e => e instanceof NavigationStart)
      )
      .subscribe(() => this.modalRef.hide());
  }

  // ----------------------------------------------------------------------------------------------------------------
  private createForm() {
    this.editorForm = this.fb.group(
      {
        id: [this.user?.id],
        email: [this.user?.email, [Validators.required, Validators.email]],
        username: [this.user?.login, Validators.required],
        password: this.fb.group(
          {
            password: [null],
            passwordCheck: [null]
          }, { validators: this.passwordsValidator.bind(this) }),
        firstName: [this.user?.firstName],
        lastName: [this.user?.lastName],
        companyName: [this.user?.companyName],
        address: [this.user?.address],
        postalCode: [this.user?.postalCode],
        city: [this.user?.city],
        state: [this.user?.state],
        country: [this.user?.country],
        phone: [this.user?.phone],
      });
  }

  // --------------------------------------------------------------------------------------------------
  private passwordsValidator: ValidatorFn = (group: FormGroup): ValidationErrors | null => {
    if (!this.changePassword && !!this.user)
      return null;

    const password = group.get('password').value;

    if (!password)
      return { 'required': true };

    if (password.length < 8)
      return { 'passwordMinimumLengthRequired': true };

    if (!/[0-9]/g.test(password) || !/[a-z]/g.test(password) || !/[A-Z]/g.test(password))
      return { 'passwordLowComplexity': true };

    const passwordCheck = group.get('passwordCheck').value;

    if (!passwordCheck || password !== passwordCheck)
      return { 'passwordMismatch': true };

    return null;
  }

  // ----------------------------------------------------------------------------------------------------------------
  close() {
    this.modalRef.hide();
  }

  // ----------------------------------------------------------------------------------------------------------------
  saveChanges() {
    this.working = true;

    let observable: Observable<UserResponse>;

    const changes = this.editorForm.getRawValue();

    if (this.changePassword) {
      observable = this.securityService.changeUserPassword(this.user.id, changes.password, changes.passwordConfirmation);
    }
    else {
      const user: any = {
        login: changes.username,
        email: changes.email,
        password: changes.password.password
      };

      if (changes.firstName)
        user.firstName = changes.firstName;

      if (changes.lastName)
        user.lastName = changes.lastName;

      if (changes.phone)
        user.phone = changes.phone;

      observable = this.user
        ? this.securityService.editUser(this.user.id, user)
        : this.securityService.addUser(user);
    }

    observable.subscribe(x => {
      this.save.next(x as User);

      this.close();
    }, err => {
      this.toastr.error(err.error.message);

      this.working = false;
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void {
    if (!this.user)
      this.changePassword = false;

    this.createForm();
  }
}
