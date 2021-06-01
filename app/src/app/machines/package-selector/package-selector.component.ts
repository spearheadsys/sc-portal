import { Component, OnInit, Input } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';
import { NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { CatalogPackage } from '../../catalog/models/package';

@Component({
  selector: 'app-package-selector',
  templateUrl: './package-selector.component.html',
  styleUrls: ['./package-selector.component.scss']
})
export class PackageSelectorComponent implements OnInit
{
  @Input()
  machine: any;

  save = new Subject<CatalogPackage>();
  imageType: number;
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
  }

  // ----------------------------------------------------------------------------------------------------------------
  private createForm()
  {
    this.editorForm = this.fb.group(
      {
        package: [null, Validators.required]
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
    this.save.next(this.editorForm.get('package').value);
    this.modalRef.hide();
  }

  // ----------------------------------------------------------------------------------------------------------------
  packageSelected(pkg: any)
  {
    this.editorForm.get('package').setValue(pkg);
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
    switch (this.machine.type)
    {
      case 'virtualmachine':
        this.imageType = 1;
        break;

      case 'smartmachine':
        this.imageType = 2;
        break;
    }

    this.createForm();
  }
}
