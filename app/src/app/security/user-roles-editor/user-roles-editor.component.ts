import { Component, OnInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';
import { NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-user-roles-editor',
  templateUrl: './user-roles-editor.component.html',
  styleUrls: ['./user-roles-editor.component.scss']
})
export class UserRolesEditorComponent implements OnInit
{
  save = new Subject<any>();
  loading: boolean;
  working: boolean;
  editorForm: FormGroup;

  private destroy$ = new Subject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly modalRef: BsModalRef,
    private readonly router: Router,
    private readonly fb: FormBuilder)
  {    // When the user navigates away from this route, hide the modal
    router.events
      .pipe(
        takeUntil(this.destroy$),
        filter(e => e instanceof NavigationStart)
      )
      .subscribe(() => this.modalRef.hide());

    this.createForm();
  }

  // ----------------------------------------------------------------------------------------------------------------
  private createForm()
  {
    this.editorForm = this.fb.group(
      {
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
    console.log(this.editorForm.getRawValue());

    this.close();
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
  }
}
