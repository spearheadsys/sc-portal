import { Directive, AfterViewInit, OnDestroy, ElementRef, Output, EventEmitter, Input } from '@angular/core';

@Directive({
  selector: '[lazyLoad]'
})
export class LazyLoadDirective implements AfterViewInit, OnDestroy
{
  @Input()
  container: any;

  @Input()
  lazyLoadDelay: number;

  @Output()
  canLoad = new EventEmitter();

  @Output()
  load = new EventEmitter();

  @Output()
  unload = new EventEmitter();

  private observer: any;
  private delay: any;
  private options: {};

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly el: ElementRef) { }

  // ----------------------------------------------------------------------------------------------------------------
  private canLazyLoad = () => window && 'IntersectionObserver' in window;

  // ----------------------------------------------------------------------------------------------------------------
  private loadOnIntersection()
  {
    this.observer = new IntersectionObserver(entries =>
    {
      entries.forEach(({ isIntersecting }) =>
      {
        if (isIntersecting)
        {
          this.canLoad.emit();

          this.delay = setTimeout(() =>
          {
            this.load.emit();
          }, this.lazyLoadDelay);
        }
        else
        {
          clearTimeout(this.delay);
          this.unload.emit();
        }
      });
    });

    this.observer.observe(this.el.nativeElement, this.options);
  }

  // ----------------------------------------------------------------------------------------------------------------
  private loadWithDelay()
  {
    this.canLoad.emit();

    this.delay = setTimeout(() =>
    {
      this.load.emit();
    }, this.lazyLoadDelay);
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngAfterViewInit()
  {
    this.options = {
      threshold: 1.0,
      rootMargin: '0px',
      root: this.container
    };
    
    this.canLazyLoad() ? this.loadOnIntersection() : this.loadWithDelay();
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    if (this.observer)
      this.observer.unobserve(this.el.nativeElement);
  }
}
