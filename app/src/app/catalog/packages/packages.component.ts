import { Component, OnInit, OnChanges, Input, Output, EventEmitter, SimpleChanges, ElementRef } from '@angular/core';
import { OnDestroy } from '@angular/core/core';
import { ReplaySubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CatalogService } from '../helpers/catalog.service';
import { CatalogImage } from '../../catalog/models/image';
import { CatalogImageType } from '../models/image';
import { CatalogPackage } from '../models/package';
import { PackageGroupsEnum } from '../models/package-groups';

@Component({
  selector: 'app-packages',
  templateUrl: './packages.component.html',
  styleUrls: ['./packages.component.scss']
})
export class PackagesComponent implements OnInit, OnDestroy, OnChanges
{
  @Input()
  imageType: CatalogImageType;

  @Input()
  image: CatalogImage;

  @Input()
  package: string;

  @Output()
  select = new EventEmitter();

  loadingIndicator: boolean;
  packages: CatalogPackage[];
  
  private _packages: CatalogPackage[];
  private _selectedPackage: CatalogPackage;
  private destroy$ = new Subject();
  private onChanges$ = new ReplaySubject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly catalogService: CatalogService,
    private readonly elementRef: ElementRef)
  {
    this.getPackages();
  }

  // ----------------------------------------------------------------------------------------------------------------
  set selectedPackage(value: CatalogPackage)
  {
    this._selectedPackage = value;

    this.select.next(value);
  }
  get selectedPackage(): CatalogPackage
  {
    return this._selectedPackage;
  }

  // ----------------------------------------------------------------------------------------------------------------
  private getPackages()
  {
    this.loadingIndicator = true;

    this.catalogService.getPackages()
      .subscribe(response => 
        {
          this._packages = response;

          this.setPackagesByImageType();

          this.loadingIndicator = false;
        });
  }

  // ----------------------------------------------------------------------------------------------------------------
  private setPackagesByImageType()
  {
    this._selectedPackage = null;
    
    this.packages = this._packages.filter(x => 
    {
      if (this.imageType === CatalogImageType.InfrastructureContainer && x.group === PackageGroupsEnum.Infra || 
        this.imageType === CatalogImageType.VirtualMachine && x.group === PackageGroupsEnum.Vm)
      {
        if (x.name === this.package)
          this._selectedPackage = x;

        return true;
      }

      return false;
    }).sort((a, b) => 
    {
      if (a.vcpus === b.vcpus && a.memory === b.memory)
        return a.memory > b.memory ? a.memory : b.memory;

      if (a.memory === b.memory)
        return a.disk > b.disk ? a.disk : b.disk;

      return a.vcpus > b.vcpus ? a.vcpus : b.vcpus;
    });

    if (this._selectedPackage)
      setTimeout(() => 
      {
        this.elementRef.nativeElement.querySelector(`#package-${this._selectedPackage.id}`)
          .scrollIntoView({behavior:'auto', block: 'center'});
      }, 0);
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
    this.onChanges$.pipe(takeUntil(this.destroy$))
      .subscribe((changes: SimpleChanges) =>
      {
        if (changes.image?.currentValue && changes.imageType?.currentValue)
        this.setPackagesByImageType();
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnChanges(changes: SimpleChanges): void
  {
    // Since we can't control if ngOnChanges is executed before ngOnInit, we need this trick
    this.onChanges$.next(changes);
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnDestroy(): void
  {
    this.destroy$.next();
  }
}
