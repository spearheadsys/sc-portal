import { Component, OnInit, Input } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';
import { NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { MachinesService } from '../helpers/machines.service';
import { ToastrService } from 'ngx-toastr';
import { Machine } from '../models/machine';

@Component({
  selector: 'app-machine-tag-editor',
  templateUrl: './machine-tag-editor.component.html',
  styleUrls: ['./machine-tag-editor.component.scss']
})
export class MachineTagEditorComponent implements OnInit
{
  @Input()
  machine: Machine;

  @Input()
  showMetadata: boolean;

  save = new Subject<{ key: string; value: string }[]>();
  loading: boolean;
  working: boolean;
  editorForm: FormGroup;
  focus = 1;

  private destroy$ = new Subject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly machinesService: MachinesService,
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
      ? Object.keys(this.machine.metadata).map(key => this.fb.group({
        key: [key, Validators.required],
        value: [this.machine.metadata[key], Validators.required]
      }))
      : Object.keys(this.machine.tags).map(key => this.fb.group({
        key: [key, Validators.required],
        value: [this.machine.tags[key], Validators.required]
      }))
    );

    this.editorForm = this.fb.group({
      items,
      key: [null],
      value: [null]
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
    this.modalRef.hide();
  }

  // ----------------------------------------------------------------------------------------------------------------
  saveChanges()
  {
    this.working = true;

    const items = this.editorForm.getRawValue().items.reduce((map, item) =>
    {
      map[item.key] = item.value;
      return map;
    }, {});

    const observable = this.showMetadata
      ? this.machinesService.replaceMetadata(this.machine.id, items)
      : this.machinesService.replaceTags(this.machine.id, items);

    observable.subscribe(response =>
    {
      this.working = false;
      this.save.next(response);
      this.modalRef.hide();
    }, err =>
    {
      this.toastr.error(err.error.message);
      this.working = false;
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
    //this.machinesService.getTags(this.machine.id).subscribe();

    this.createForm();
  }
}
