import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-affinity-rule-editor',
  templateUrl: './affinity-rule-editor.component.html',
  styleUrls: ['./affinity-rule-editor.component.scss']
})
export class AffinityRuleEditorComponent implements OnInit, OnDestroy
{
  @Input()
  disabled: boolean;

  @Output()
  saved = new EventEmitter();

  editorVisible: boolean;
  editorForm: FormGroup;

  private destroy$ = new Subject();

  // --------------------------------------------------------------------------------------------------
  constructor(private readonly elementRef: ElementRef,
    private readonly fb: FormBuilder) { }

  // ----------------------------------------------------------------------------------------------------------------
  private createForm()
  {
    this.editorForm = this.fb.group(
      {
        strict: [null, Validators.required],
        operator: [null, Validators.required],
        target: [null, Validators.required],
        tagName: [null],
        value: [null, Validators.required]
      });

      this.editorForm.get('target').valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(target => 
        {
          if (target === 'tagName')
            this.editorForm.get('tagName').setValidators(Validators.required);
          else
            this.editorForm.get('tagName').clearValidators();
        });
  }

  // --------------------------------------------------------------------------------------------------
  showEditor()
  {
    if (this.disabled) return;

    this.editorVisible = true;

    addEventListener('click', this.onDocumentClick.bind(this));
  }

  // --------------------------------------------------------------------------------------------------
  saveChanges()
  {
    event.preventDefault();
    event.stopPropagation();

    this.editorVisible = false;

    this.removeEventListeners();

    let rule: string;

    if (this.editorForm.get('target').value === 'instance')
      rule = `instance${this.editorForm.get('operator').value}${this.editorForm.get('strict').value}${this.editorForm.get('value').value}`;
    else
      rule = `${this.editorForm.get('tagName').value}${this.editorForm.get('operator').value}${this.editorForm.get('strict').value}${this.editorForm.get('value').value}`;

    this.saved.emit({
      strict: this.editorForm.get('strict').value === '=',
      closeTo: this.editorForm.get('operator').value === '=',
      targetMachine: this.editorForm.get('target').value === 'instance',
      tagName: this.editorForm.get('tagName').value,
      value: this.editorForm.get('value').value,
      rule
    });

    this.resetForm();
  }

  // --------------------------------------------------------------------------------------------------
  cancelChanges()
  {
    this.editorVisible = false;

    this.removeEventListeners();

    this.resetForm();
  }

  // --------------------------------------------------------------------------------------------------
  private resetForm()
  {
    this.editorForm.get('strict').setValue(null);
    this.editorForm.get('operator').setValue(null);
    this.editorForm.get('target').setValue(null);
    this.editorForm.get('tagName').setValue(null);
    this.editorForm.get('value').setValue(null);
  }

  // --------------------------------------------------------------------------------------------------
  @HostListener('document:keydown.escape', ['$event'])
  escapePressed(event)
  {
    this.cancelChanges();
  }

  // --------------------------------------------------------------------------------------------------
  protected onDocumentClick(event: MouseEvent)
  {
    if (!this.elementRef.nativeElement.contains(event.target))
      this.cancelChanges();
  }

  // --------------------------------------------------------------------------------------------------
  private removeEventListeners()
  {
    removeEventListener('click', this.onDocumentClick);
    removeEventListener('document:keydown.escape', this.escapePressed);
  }

  // --------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
    this.createForm();
  }

  // --------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    this.removeEventListeners();

    this.destroy$.next();
  }
}
