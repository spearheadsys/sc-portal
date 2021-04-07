import { Component, OnInit, Input } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';
import { NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { InstancesService } from '../helpers/instances.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-instance-tag-editor',
  templateUrl: './instance-tag-editor.component.html',
  styleUrls: ['./instance-tag-editor.component.scss']
})
export class InstanceTagEditorComponent implements OnInit
{
  @Input()
  instance: any;

  @Input()
  showMetadata: boolean;

  save = new Subject<{ key: string; value: string }[]>();
  loading: boolean;
  working: boolean;
  editorForm: FormGroup;
  focus = 1;

  private destroy$ = new Subject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly instancesService: InstancesService,
    private readonly modalRef: BsModalRef,
    private readonly router: Router,
    private readonly fb: FormBuilder,
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
  private createForm()
  {
    const items = this.fb.array(this.showMetadata
      ? Object.keys(this.instance.metadata).map(key => this.fb.group({ key, value: this.instance.metadata[key] }))
      : Object.keys(this.instance.tags).map(key => this.fb.group({ key, value: this.instance.tags[key] }))
    );

    this.editorForm = this.fb.group({
      items,
      key: [null, Validators.required],
      value: [null, Validators.required]
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  addTag()
  {
    const array = this.editorForm.get('items') as FormArray;
    const key = this.editorForm.get('key').value;
    const value = this.editorForm.get('value').value;

    if (array.controls.find(x => x.get('key').value === key))
    {
      this.toastr.warning(`The key "${key}" is already present`);
      return;
    }

    array.push(this.fb.group({ key, value }));

    // Clear the form
    this.editorForm.get('key').setValue(null);
    this.editorForm.get('value').setValue(null);

    this.focus++;
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteTag(index: number)
  {
    const array = this.editorForm.get('items') as FormArray;
    array.removeAt(index);
  }

  // ----------------------------------------------------------------------------------------------------------------
  close()
  {
    this.save.next();
    this.modalRef.hide();
  }

  // ----------------------------------------------------------------------------------------------------------------
  saveChanges()
  {
    const items = this.editorForm.getRawValue().items.reduce((map, item) =>
    {
      map[item.key] = item.value;
      return map;
    }, {});

    const observable = this.showMetadata
      ? this.instancesService.replaceMetadata(this.instance.id, items)
      : this.instancesService.replaceTags(this.instance.id, items);

    observable.subscribe(response =>
    {
      this.save.next(response);
      this.modalRef.hide();
    }, err =>
    {
      this.toastr.error(err.error.message);
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
    this.createForm();
  }
}
