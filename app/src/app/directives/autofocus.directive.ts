import { Directive, Input, ElementRef, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[appAutofocus]'
})
export class AutofocusDirective implements AfterViewInit, OnChanges
{
  @Input()
  appAutofocus = false;

  @Input()
  appAutofocusDelay: number;

  @Input()
  appFocusAnyElement: boolean;

  private focusElement: any;

  // --------------------------------------------------------------------------------------------------
  constructor(private readonly element: ElementRef) { }

  // --------------------------------------------------------------------------------------------------
  ngAfterViewInit(): void
  {
    if (this.element.nativeElement.nodeName === 'INPUT' ||
      this.element.nativeElement.nodeName === 'TEXTAREA' ||
      this.element.nativeElement.nodeName === 'SELECT')
      this.focusElement = this.element.nativeElement;
    else
      this.focusElement = this.appFocusAnyElement
        ? this.element.nativeElement
        : this.element.nativeElement.querySelector('select, textarea, input');

    this.setFocus();
  }

  // --------------------------------------------------------------------------------------------------
  ngOnChanges(changes: SimpleChanges): void
  {
    this.setFocus();
  }

  // --------------------------------------------------------------------------------------------------
  private setFocus()
  {
    if (!this.appAutofocus) return;

    setTimeout(() =>
    {
      if (!this.focusElement) return;

      this.focusElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

      try
      {
        this.focusElement.select();
      }
      catch (e)
      {
        this.focusElement.focus();
      }
    }, (this.appAutofocusDelay | 0));
  }
}
