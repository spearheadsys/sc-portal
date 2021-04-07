import { Component, OnInit, Input } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';
import { NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-custom-image-editor',
  templateUrl: './custom-image-editor.component.html',
  styleUrls: ['./custom-image-editor.component.scss']
})
export class CustomImageEditorComponent implements OnInit
{
  @Input()
  instance: any;

  save = new Subject<any>();
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
  }

  // ----------------------------------------------------------------------------------------------------------------
  private createForm()
  {
    this.editorForm = this.fb.group(
      {
        name: [null, Validators.required],
        version: [null, Validators.required],
        description: [null]
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
    this.save.next(this.editorForm.getRawValue());
    this.modalRef.hide();
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
    this.createForm();
  }
}
