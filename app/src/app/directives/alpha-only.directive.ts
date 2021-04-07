import { Directive, ElementRef, HostListener, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[appAlphaOnly]'
})
export class AlphaOnlyDirective implements OnInit, OnChanges
{
  @Input()
  appAlphaOnly = '^[A-Za-z0-9]+$';

  private regex;
  //private negateRegex;

  // --------------------------------------------------------------------------------------------------
  constructor(private readonly el: ElementRef) { }

  // --------------------------------------------------------------------------------------------------
  @HostListener('keypress', ['$event'])
  onKeyPress(event)
  {
    return this.regex ? this.regex.test(event.key) : true;
  }

  // --------------------------------------------------------------------------------------------------
  @HostListener('paste', ['$event'])
  onPaste(event)
  {
    if (!this.regex) return;

    event.preventDefault();
    //const value = event.clipboardData.getData('text/plain').replace(this.negateRegex, '');
    const value = event.clipboardData.getData('text/plain').trim();
    if (value.match(this.regex))
      document.execCommand('insertHTML', false, value);
  }

  // --------------------------------------------------------------------------------------------------
  ngOnInit()
  {
    if (!this.appAlphaOnly) return;

    this.regex = new RegExp(this.appAlphaOnly);
    //this.regex = new RegExp(`^[${this.appAlphaOnly}]+$`);
    //this.negateRegex = new RegExp(`[^${this.appAlphaOnly}]`, 'g');
  }

  // --------------------------------------------------------------------------------------------------
  ngOnChanges(changes: SimpleChanges): void
  {
    if (changes.appAlphaOnly.currentValue)
      this.regex = new RegExp(this.appAlphaOnly);
  }
}
