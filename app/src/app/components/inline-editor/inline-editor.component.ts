import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';

@Component({
  selector: 'app-inline-editor',
  templateUrl: './inline-editor.component.html',
  styleUrls: ['./inline-editor.component.scss']
})
export class InlineEditorComponent implements OnInit, OnDestroy
{
  @Input()
  buttonTitle: string;

  @Input()
  singleLine: boolean;

  @Input()
  key: string;

  @Input()
  keyLabel = 'Key';

  @Input()
  keyAllowedCharacters: string;

  @Input()
  keyPattern: string;

  @Input()
  value: string;

  @Input()
  valueLabel = 'Value';

  @Input()
  valueAllowedCharacters: string;

  @Input()
  valuePattern: string;

  @Input()
  showValue = true;

  @Input()
  disabled: boolean;

  @Output()
  saved = new EventEmitter();

  editorVisible: boolean;
  editorForm: FormGroup;

  // --------------------------------------------------------------------------------------------------
  constructor(private readonly elementRef: ElementRef,
    private readonly fb: FormBuilder) { }

  // ----------------------------------------------------------------------------------------------------------------
  private createForm()
  {
    this.editorForm = this.fb.group(
      {
        key: [this.key],
        value: [this.value]
      });

    if (this.keyPattern)
      this.editorForm.get('key').setValidators([Validators.required, Validators.pattern(this.keyPattern)]);
    else
      this.editorForm.get('key').setValidators([Validators.required]);

    if (this.valuePattern)
      this.editorForm.get('value').setValidators([Validators.required, Validators.pattern(this.valuePattern)]);
    else if (this.showValue)
      this.editorForm.get('value').setValidators([Validators.required]);
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

    if (this.showValue)
      this.saved.emit({
        key: this.editorForm.get('key').value,
        value: this.editorForm.get('value').value
      });
    else
      this.saved.emit(this.editorForm.get('key').value);

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
    this.editorForm.get('key').setValue(null);
    this.editorForm.get('value').setValue(null);
  }

  // --------------------------------------------------------------------------------------------------
  @HostListener('document:keydown.enter', ['$event'])
  returnPressed(event)
  {
    if (event.target === this.elementRef.nativeElement.querySelector('textarea') && this.singleLine)
    {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  // --------------------------------------------------------------------------------------------------
  @HostListener('document:keydown.escape', ['$event'])
  escapePressed(event)
  {
    this.cancelChanges();
  }

  // --------------------------------------------------------------------------------------------------
  @HostListener('input', ['$event'])
  textEntered(event)
  {
    if (event.currentTarget === this.elementRef.nativeElement && this.singleLine && this.value)
      this.editorForm.get('value').setValue(this.editorForm.get('value').value.replace(/\n/g, ''));
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
    removeEventListener('input', this.textEntered);
    removeEventListener('document:keydown.enter', this.returnPressed);
    removeEventListener('document:keydown.escape', this.escapePressed);
  }

  // --------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
    if (!this.buttonTitle)
      throw 'Specify a button title for the inline editor';

    this.createForm();
  }

  // --------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    this.removeEventListeners();
  }
}
