import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';
import { NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-role-policies-editor',
  templateUrl: './role-policies-editor.component.html',
  styleUrls: ['./role-policies-editor.component.scss']
})
export class RolePoliciesEditorComponent implements OnInit, OnDestroy
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
  @HostListener('document:keydown.escape', ['$event'])
  close()
  {
    removeEventListener('document:keydown.escape', this.close);
    removeEventListener('document:keydown.return', this.saveChanges);

    this.modalRef.hide();
  }

  // ----------------------------------------------------------------------------------------------------------------
  @HostListener('document:keydown.return', ['$event'])
  saveChanges()
  {
    console.log(this.editorForm.getRawValue());

    this.close();
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
  }

  // --------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    removeEventListener('document:keydown.escape', this.close);
    removeEventListener('document:keydown.return', this.saveChanges);
  }
}
